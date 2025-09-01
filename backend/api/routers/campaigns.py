from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends
from backend.models.campaigns import Campaign
from backend.models.components import MarkdownContent, Metadata
from backend.services.neo4j import query
from backend.services.neo4j.queries import build_create_query
from backend.api.auth import get_current_user

router = APIRouter(prefix="/campaigns", tags=["campaigns"])

@router.post("/create")
async def add_campaign(
    campaign_data: MarkdownContent, 
    current_user: str = Depends(get_current_user)
):
    try:
        import uuid
        
        # Generate a proper unique ID
        campaign_id = f"camp-{str(uuid.uuid4())[:8]}"
        
        metadata = Metadata(
            id=campaign_id,
            created_at=datetime.now(),
            updated_at=datetime.now(),
        )

        campaign = Campaign(content=campaign_data, metadata=metadata)

        # Create campaign and link to user (create user if doesn't exist)
        result = query(
            """
            MERGE (u:User {id: $user_id})
            CREATE (c:Campaign {
                id: $campaign_id,
                title: $title,
                markdown: $markdown,
                createdAt: $createdAt,
                updatedAt: $updatedAt
            })
            CREATE (u)-[:OWNS]->(c)
            RETURN c.id as id, c.title as title, c.createdAt as createdAt, c.updatedAt as updatedAt
            """,
            user_id=current_user,
            campaign_id=campaign_id,
            title=campaign_data.title,
            markdown=campaign_data.markdown,
            createdAt=int(metadata.created_at.timestamp() * 1000),
            updatedAt=int(metadata.updated_at.timestamp() * 1000),
        )

        if result:
            # Trigger embedding generation for the new campaign
            try:
                from backend.services.sync_hooks import get_sync_embedding_hook
                from backend.models.components import Change
                
                hook = get_sync_embedding_hook()
                
                # Create a change object to trigger embedding
                change = Change(
                    entity="node",
                    entityId=campaign_id,
                    op="create",
                    payload={"title": campaign_data.title, "markdown": campaign_data.markdown},
                    ts=int(metadata.created_at.timestamp() * 1000)
                )
                
                hook.on_sync_changes([change])
            except Exception as e:
                print(f"Warning: Failed to trigger embedding for new campaign: {e}")
                # Don't fail the request if embedding fails
            
            return {"message": "Campaign created successfully!", "campaign": result[0]}
        else:
            raise HTTPException(status_code=500, detail="Failed to create campaign")

    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.delete("/")
async def delete_campaign(campaign_id: str):

    try:
        _ = query(
            """
        MATCH (n:Campaign {id: $campaign_id})
        DELETE n
      """,
            campaign_id=campaign_id,
        )

        return {"message": f"Campaign: {campaign_id} deleted"}

    except HTTPException as exc:
        raise exc

@router.get("/user")
async def get_user_campaigns(current_user: str = Depends(get_current_user)):
    """Get all campaigns owned by the current user"""
    try:
        result = query(
            """
            OPTIONAL MATCH (u:User {id: $user_id})-[:OWNS]->(c:Campaign)
            RETURN c.id as id, c.title as title, c.createdAt as createdAt, c.updatedAt as updatedAt
            ORDER BY c.updatedAt DESC
            """,
            user_id=current_user,
        )

        campaigns = []
        for record in result:
            campaigns.append(
                {
                    "id": record["id"],
                    "title": record["title"],
                    "slug": record["id"],  # Use ID as slug for now
                    "created_at": record["createdAt"],
                    "updated_at": record["updatedAt"],
                }
            )

        return campaigns

    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

