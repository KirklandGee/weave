import json
from typing import Annotated

from fastapi import APIRouter, Header, HTTPException
from backend.models.components import SidebarNode, Change, Edge
from backend.services.neo4j import query

router = APIRouter(prefix="/sync", tags=["sync"])

UserIdHeader = Annotated[str, Header(alias="X-User-Id")]


# ───────────────────────────────────────────────────────── sidebar list ──
@router.get("/{campaign_id}/sidebar", response_model=list[SidebarNode])
async def get_sidebar_nodes(
    campaign_id: str,
    uid: UserIdHeader,
):
    try:
        records = query(
            """
            MATCH (u:User {id:$uid})

            OPTIONAL MATCH (u)-[:OWNS]->(c:Campaign {id:$cid})<-[:PART_OF]-(n1)
            OPTIONAL MATCH (u)-[:PART_OF]->(n2)
            WHERE $cid IS NULL

            WITH coalesce(n1,n2) AS n WHERE n IS NOT NULL
            WITH n, properties(n) AS props
            RETURN {
              id:        props.id,
              type:      props.type,
              title:     props.title,
              markdown:  props.markdown,
              updatedAt: props.updatedAt.epochMillis,
              createdAt: props.createdAt.epochMillis,
              attributes: apoc.map.removeKeys(
                 props,['id','type','title','markdown','updatedAt','createdAt']
              )
            } AS node
            """,
            uid=uid,
            cid=campaign_id if campaign_id != "global" else None,
        )
        return [r["node"] for r in records]
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


# ───────────────────────────────────────────────────────── bulk sync ──
@router.post("/{cid}")
async def push_changes(
    cid: str,
    changes: list[Change],
    uid: UserIdHeader,
):
    try:
        for ch in changes:

            # ---------- UPDATE ----------
            if ch.op == "update":
                _ = query(
                    """
                    MATCH (u:User {id:$uid})-[:OWNS]->(c:Campaign {id:$cid})
                          <-[:PART_OF]-(n {id:$nid})
                    SET   n += $payload,
                          n.updatedAt = $ts
                    """,
                    uid=uid,
                    cid=cid,
                    nid=ch.nodeId,
                    payload=ch.payload,
                    ts=ch.ts,
                )

            # ---------- CREATE ----------
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
                    MATCH (u:User {id:$uid})
                    OPTIONAL MATCH (u)-[:OWNS]->(c:Campaign {id:$cid})
                    FOREACH (_ IN CASE WHEN c IS NULL THEN [] ELSE [1] END |
                      MERGE (node)-[:PART_OF]->(c)
                    )
                    MERGE (u)-[:PART_OF]->(node)
                    """,
                    uid=uid,
                    cid=cid,
                    nid=ch.nodeId,
                    label=label,
                    props=props,
                )

            # ---------- DELETE ----------
            elif ch.op == "delete":
                _ = query(
                    """
                    MATCH (u:User {id:$uid})-[:OWNS]->(c:Campaign {id:$cid})
                          <-[:PART_OF]-(n {id:$nid})
                    DETACH DELETE n
                    """,
                    uid=uid,
                    cid=cid,
                    nid=ch.nodeId,
                )

        return {"status": "ok"}

    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


# ───────────────────────────────────────────── incremental updates ──
@router.get("/{cid}/since/{ts}", response_model=list[SidebarNode])
async def get_updates(
    cid: str,
    ts: int,
    uid: UserIdHeader,
):
    try:
        records = query(
            """
            MATCH (u:User {id:$uid})
            OPTIONAL MATCH (u)-[:OWNS]->(c:Campaign {id:$cid})<-[:PART_OF]-(n1)
            OPTIONAL MATCH (u)-[:PART_OF]->(n2)
            WITH coalesce(n1,n2) AS n
            WHERE n.updatedAt.epochMillis > $ts
            WITH n, properties(n) AS props
            RETURN {
              id:        props.id,
              type:      props.type,
              title:     props.title,
              markdown:  props.markdown,
              updatedAt: props.updatedAt.epochMillis,
              createdAt: props.createdAt.epochMillis,
              attributes: apoc.map.removeKeys(
                 props,['id','type','title','markdown','updatedAt','createdAt']
              )
            } AS node
            """,
            uid=uid,
            cid=cid if cid != "global" else None,
            ts=ts,
        )
        return [r["node"] for r in records]
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


# ─────────────────────────────────────────────── edges for a node ──
@router.get("/{cid}/node/{nid}/edges", response_model=list[Edge])
async def get_campaign_edges(
    cid: str,
    nid: str,
    uid: UserIdHeader,
):
    try:
        records = query(
            """
            MATCH (u:User {id:$uid})-[:OWNS]->(c:Campaign {id:$cid})
                  <-[:PART_OF]-(n {id:$nid})
            MATCH (n)-[r]-(m)
            RETURN {
              id:        r.id,
              from:      startNode(r).id,
              to:        endNode(r).id,
              direction: CASE WHEN startNode(r).id = $nid THEN 'out' ELSE 'in' END,
              relType:   type(r),
              updatedAt: r.updatedAt.epochMillis,
              props:     apoc.map.removeKeys(properties(r),['id','updatedAt']),
              target: {
                id:    m.id,
                title: m.title,
                type:  m.type
              }
            } AS edge
            """,
            uid=uid,
            cid=cid,
            nid=nid,
        )
        return [r["edge"] for r in records]   # <-- alias is edge
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))