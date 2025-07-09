import json
from typing import Annotated, Literal

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
              updatedAt: props.updatedAt,
              createdAt: props.createdAt,
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
            if ch.entity == "edge":
                if ch.op == "create":
                    params = {
                    "from": ch.payload["from"],
                    "to":   ch.payload["to"],
                    "rid":  ch.entityId,
                    "props": {k:v for k,v in ch.payload.items()
                            if k not in ("from","to","relType")},
                    "ts":   ch.ts,
                }
                    cypher = """
                    MATCH (a {id:$from_id}), (b {id:$to_id})
                    CALL apoc.merge.relationship(a, $relType, {}, {}, b) YIELD rel AS r
                    SET  r += $props,
                        r.createdAt = coalesce(r.createdAt,$ts),
                        r.updatedAt = $ts
                    """
                    _ = query(
                        cypher,
                        **params
                    )
                # ---------- UPDATE ----------
                elif ch.op == "update":
                    _ = query(
                        """
                        MATCH ()-[r {id:$rid}]->()
                        SET   r += $props,
                            r.updatedAt = $ts
                        """,
                        rid=ch.entityId,
                        props=ch.payload,
                        ts=ch.ts,
                    )
                # ---------- DELETE ----------
                else:  # delete
                    _ = query(
                        """
                        MATCH ()-[r {id:$rid}]->() DELETE r
                        """,
                        rid=ch.entityId,
                    )
            if ch.entity == "node":

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
                        nid=ch.entityId,
                        payload=ch.payload,
                        ts=ch.ts,
                    )

                # ---------- CREATE ----------
                elif ch.op == "create":
                    label = ch.payload.get("type") or "Node"
                    props = {**ch.payload, "updatedAt": ch.ts}
                    attrs = props.get("attributes")
                    if isinstance(attrs, dict):
                        props["attributes"] = json.dumps(attrs) if attrs else None

                    _ = query(
                        """
                        CALL apoc.merge.node([$label], {id:$nid}, $props) YIELD node
                        SET  node.createdAt = coalesce(node.createdAt, $ts),
                            node.updatedAt = $ts
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
                        nid=ch.entityId,
                        label=label,
                        ts=ch.ts,
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
                        nid=ch.entityId,
                    )

        return {"status": "ok"}

    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


# ───────────────────────────────────────────── incremental updates ──
@router.get("/{cid}/nodes/since/{ts}", response_model=list[SidebarNode])
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
            WHERE n.updatedAt > $ts
            WITH n, properties(n) AS props
            RETURN {
              id:        props.id,
              type:      props.type,
              title:     props.title,
              markdown:  props.markdown,
              updatedAt: props.updatedAt,
              createdAt: props.createdAt,
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


# ────────────────────────────────────────── incremental REL updates ──
@router.get("/{cid}/edges/since/{ts}", response_model=list[Edge])
async def get_edges(
    cid: str,
    ts: int,
    uid: UserIdHeader,
):
    """
    Return every relationship touching this user’s nodes/campaign whose
    r.updatedAt > ts.  Works no matter what the rel-type is (:MENTIONS, etc.).
    """
    records = query(
        """
        MATCH (u:User {id:$uid})

        // campaign-scoped nodes the user owns
        OPTIONAL MATCH (u)-[:OWNS]->(c:Campaign {id:$cid})<-[:PART_OF]-(a)
        // global nodes the user is linked to
        OPTIONAL MATCH (u)-[:PART_OF]->(b)
        WITH collect(a)+collect(b) AS nodes

        UNWIND nodes AS n
        MATCH (n)-[r]->(m)
        WHERE r.updatedAt > $ts          // ← incremental filter
        WITH DISTINCT r,                // dedup if two paths reach same rel
             startNode(r)  AS s,
             endNode(r)    AS e,
             properties(r) AS props
        RETURN {
          id:         props.id,         // you store this when creating
          from_id:    s.id,
          to_id:      e.id,
          from_title: s.title,
          to_title:   e.title,
          relType:    type(r),
          updatedAt:  props.updatedAt,
          createdAt:  props.createdAt,
          attributes: apoc.map.removeKeys(
                         props,
                         ['id','updatedAt','createdAt']
                      )
        } AS edge
        """,
        uid=uid,
        cid=None if cid == "global" else cid,
        ts=ts,
    )
    return [r["edge"] for r in records]
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
              updatedAt: r.updatedAt,
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