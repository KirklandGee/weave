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

        # Create campaign and link to user
        result = query(
            """
            MATCH (u:User {id: $user_id})
            CREATE (c:Campaign {
                id: $campaign_id,
                title: $title,
                markdown: $markdown,
                created_at: $created_at,
                updated_at: $updated_at
            })
            CREATE (u)-[:OWNS]->(c)
            RETURN c.id as id, c.title as title, c.created_at as created_at, c.updated_at as updated_at
            """,
            user_id=current_user,
            campaign_id=campaign_id,
            title=campaign_data.title,
            markdown=campaign_data.markdown,
            created_at=metadata.created_at.isoformat(),
            updated_at=metadata.updated_at.isoformat(),
        )

        if result:
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
            MATCH (u:User {id: $user_id})-[:OWNS]->(c:Campaign)
            RETURN c.id as id, c.title as title, c.created_at as created_at, c.updated_at as updated_at
            ORDER BY c.updated_at DESC
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
                    "created_at": record["created_at"],
                    "updated_at": record["updated_at"],
                }
            )

        return campaigns

    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

