from datetime import datetime
from fastapi import APIRouter, HTTPException
from backend.models.campaigns import Campaign
from backend.models.components import MarkdownContent, Metadata
from backend.services.neo4j import query
from backend.services.neo4j.queries import build_create_query

router = APIRouter(
  prefix='/campaign',
  tags=["campaign"]
)

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
