from fastapi import FastAPI
from backend.services.neo4j import query

app = FastAPI()

@app.get("/")
async def root():
    return {"message": "Hello World"}

@app.get("/campaign/all-nodes")
async def get_all_campaigns(title: str):

  try:
    nodes = query("""
          MATCH (c:Campaign {title: $title})<-[:PART_OF]-(n)
          RETURN n
          """,
              title=title,
              database_="neo4j"
    )
    return nodes
  except Exception as exc:
    raise exc