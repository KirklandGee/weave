from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends
from backend.models.campaigns import Campaign
from backend.models.components import MarkdownContent, Metadata
from backend.services.neo4j import query
from backend.services.neo4j.queries import build_create_query
from backend.api.auth import get_current_user

router = APIRouter(prefix="/campaign", tags=["campaign"])


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


@router.post("/")
async def add_campaign(campaign_data: MarkdownContent):

    metadata = Metadata(
        id=f"camp-{campaign_data.title.split()[1]}-{campaign_data.title.split()[2][:4]}",
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )

    campaign = Campaign(content=campaign_data, metadata=metadata)

    q, params = build_create_query(campaign)

    try:
        result = query(q, **params)

        if result:
            return {"message": "Campaign created successfully!", "campaign": result[0]}

    except HTTPException as exc:
        raise exc


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
