from datetime import datetime
from fastapi import FastAPI, HTTPException
from backend.models.campaigns import Campaign
from backend.models.components import MarkdownContent, Metadata, SidebarNode, Change
from backend.models.notes import Note
from backend.services.neo4j import query
from backend.services.neo4j.queries import build_create_query
from backend.models import *
import json

app = FastAPI()


@app.get("/")
async def root():
    return {"message": "Hello World"}


@app.get("/campaign/{id}/sidebar", response_model=list[SidebarNode])
async def get_sidebar_nodes(id: str):

    try:
        records = query(
            """
          MATCH (c:Campaign {id: $id})<-[:PART_OF]-(n)
          WITH n, properties(n) AS props
          RETURN {
            id:       props.id,
            type:     props.type,
            title:    props.title,
            markdown: props.markdown,
            updatedAt: props.updatedAt.epochMillis,         
            createdAt: props.createdAt.epochMillis,     
            attributes: apoc.map.removeKeys(
                        props,
                    ['id','type','title','markdown','updatedAt','createdAt']
                      )
          } AS node
          """,
            id=id,
        )
        return [r["node"] for r in records]
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/campaign/{cid}/sync")
async def push_changes(cid: str, changes: list[Change]):
    """
    `cid`   = campaign id from the URL
    `nodeId` is inside each Change object
    """
    try:
        for ch in changes:
            # ------------------- UPDATE ------------------------
            if ch.op == "update":
                _ = query(
                    """
            MATCH (c:Campaign {id:$cid})<-[:PART_OF]-(n {id:$nid})
            SET n += $payload, n.updatedAt=$ts
            """,
                    cid=cid,
                    nid=ch.nodeId,
                    payload=ch.payload,
                    ts=ch.ts,
                )
            # ------------------- CREATE ------------------------
            elif ch.op == "create":
                label = ch.payload.get("type") or "Node"
                props = {**ch.payload, "id": ch.nodeId, "updatedAt": ch.ts}
                attrs = props.get("attributes")
                if isinstance(attrs, dict):
                    props["attributes"] = json.dumps(attrs) if attrs else None

                _ = query(
                    """
                    CALL apoc.merge.node([$label], {id:$nid}, $props) YIELD node
                    WITH node
                    MATCH (c:Campaign {id:$cid})
                    MERGE (node)-[:PART_OF]->(c)
                    """,
                    cid=cid,
                    nid=ch.nodeId,
                    label=label,
                    props=props,
                )            # ------------------- DELETE ------------------------
            elif ch.op == "delete":
                _ = query(
                    """
            MATCH (c:Campaign {id:$cid})<-[:PART_OF]-(n {id:$nid})
            DETACH DELETE n
            """,
                    cid=cid,
                    nid=ch.nodeId,
                )
        return {"status": "ok"}
    except Exception as exc:
        raise HTTPException(500, str(exc))


@app.get("/campaign/{id}/since/{ts}", response_model=list[SidebarNode])
async def get_updates(id: str, ts: int):
    try:
        records = query(
            """
          MATCH (c:Campaign {id:$id})<-[:PART_OF]-(n)
          WHERE n.updatedAt > $ts
          WITH n, properties(n) AS props
          RETURN {
            id:       props.id,
            type:     props.type,
            title:    props.title,
            markdown: props.markdown,
            updatedAt: props.updatedAt.epochMillis,         
            createdAt: props.createdAt.epochMillis,     
            attributes: apoc.map.removeKeys(
                        props,
                    ['id','type','title','markdown','updatedAt','createdAt']
                      )
          } AS node
          """,
            id=id,
            ts=ts,
        )
        return [r["node"] for r in records]
    except Exception as exc:
        raise HTTPException(500, str(exc))


@app.post("/campaign")
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


@app.delete("/campaign")
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


@app.get("/note")
async def get_note(note_id: str):
    try:
        nodes = query(
            """
          MATCH (n:Note {id: $note_id})
          RETURN n
          """,
            id=note_id,
        )
        return nodes
    except HTTPException as exc:
        raise exc


@app.get("/notes")
async def get_notes(campaign_id: str):
    try:
        nodes = query(
            """
          MATCH (c:Campaign {campaign_id: $campaign_id})<-[:PART_OF]-(n:Note)
          RETURN n
          """,
            id=campaign_id,
        )
        return nodes
    except HTTPException as exc:
        raise exc


@app.post("/note")
async def add_note(note: MarkdownContent):

    metadata = Metadata(
        id=f"camp-{note.title.split()[1]}-{note.title.split()[2][:4]}",
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )

    noteNode = Note(content=note, metadata=metadata)

    q, params = build_create_query(noteNode)

    try:
        result = query(q, **params)

        if result:
            return {"message": "Note created successfully!", "note": result[0]}

    except HTTPException as exc:
        raise exc


@app.delete("/note")
async def delete_note(note_id: str):

    try:
        _ = query(
            """
        MATCH (n:Note {id: $note_id})
        DELETE n
      """,
            note_id=note_id,
        )

        return {"message": f"Note: {note_id} deleted"}

    except HTTPException as exc:
        raise exc


