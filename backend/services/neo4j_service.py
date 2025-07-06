from db.db import db


def get_campaign(campaign_title: str):
    campaigns = db.execute_query(
        """
  MATCH (c:Campaign {title: $title})
  return c
  """,
        title=campaign_title,
        database_="neo4j",
    )

    return campaigns


def get_campaign_nodes(campaign_title: str):
    campaigns = db.execute_query(
        """
MATCH (c:Campaign {title: $title})<-[r:PART_OF]-(n)
RETURN n, r;
  """,
        title=campaign_title,
        database_="neo4j",
    )

    return campaigns
