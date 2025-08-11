import json
from typing import Annotated
from fastapi import APIRouter, Header, Depends, HTTPException
from backend.models.components import Note, Change, Edge
from backend.models.folders import Folder, FolderWithChildren
from backend.services.neo4j import query
from backend.api.auth import get_current_user

router = APIRouter(prefix="/sync", tags=["sync"])


# ───────────────────────────────────────────────────────── sidebar list ──
@router.get("/{campaign_id}/sidebar", response_model=list[Note])
async def get_sidebar_nodes(
    campaign_id: str,
    user_id: str = Depends(get_current_user),
):
    try:
        records = query(
            """
            MATCH (u:User {id:$user_id})

            OPTIONAL MATCH (u)-[:OWNS]->(c:Campaign {id:$cid})<-[:PART_OF]-(n1)
            OPTIONAL MATCH (u)-[:PART_OF]->(n2)
            WHERE $cid IS NULL

            WITH coalesce(n1,n2) AS n WHERE n IS NOT NULL AND NOT n:FOLDER
            WITH n, properties(n) AS props
            RETURN {
              id:        props.id,
              type:      coalesce(props.type, 'Note'),
              title:     coalesce(props.title, props.name, 'Untitled'),
              ownerId:   props.ownerId,      // ← ADD THIS
              campaignId: props.campaignId,  // ← ADD THIS  
              markdown:  props.markdown,
              updatedAt: coalesce(props.updatedAt, 0),
              createdAt: coalesce(props.createdAt, 0),
              attributes: apoc.map.removeKeys(
                 props,['id','type','title','name','markdown','updatedAt','createdAt']
              )
            } AS node
            """,
            user_id=user_id,
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
    user_id: str = Depends(get_current_user),
):
    try:
        for ch in changes:
            if ch.entity == "edge":
                if ch.op == "create":
                    # Serialize attributes if it's a dict
                    props = {
                        k: v
                        for k, v in ch.payload.items()
                        if k not in ("fromId", "toId", "relType")
                    }

                    # Handle attributes serialization
                    if "attributes" in props and isinstance(props["attributes"], dict):
                        props["attributes"] = (
                            json.dumps(props["attributes"])
                            if props["attributes"]
                            else None
                        )

                    params = {
                        "from_id": ch.payload["fromId"],
                        "to_id": ch.payload["toId"],
                        "rid": ch.entityId,
                        "relType": ch.payload["relType"],
                        "props": props,
                        "ts": ch.ts,
                    }
                    cypher = """
                    MATCH (a {id:$from_id}), (b {id:$to_id})
                    CALL apoc.merge.relationship(a, $relType, {}, {}, b) YIELD rel AS r
                    SET  r += $props,
                        r.createdAt = coalesce(r.createdAt,$ts),
                        r.updatedAt = $ts
                    """
                    _ = query(cypher, **params)
                # ---------- UPDATE ----------
                elif ch.op == "update":
                    props = ch.payload.copy()
                    # Handle attributes serialization for updates too
                    if "attributes" in props and isinstance(props["attributes"], dict):
                        props["attributes"] = (
                            json.dumps(props["attributes"])
                            if props["attributes"]
                            else None
                        )

                    _ = query(
                        """
                        MATCH ()-[r {id:$rid}]->()
                        SET   r += $props,
                            r.updatedAt = $ts
                        """,
                        rid=ch.entityId,
                        props=props,
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
            elif ch.entity == "folders":
                # ---------- CREATE/UPDATE ----------
                if ch.op in ["create", "upsert"]:
                    props = {**ch.payload, "updatedAt": ch.ts}
                    print(f"DEBUG: Folder sync payload: {ch.payload}")
                    print(f"DEBUG: Final props: {props}")
                    
                    _ = query(
                        """
                        MERGE (node:FOLDER {id:$fid})
                        SET  node += $props,
                             node.createdAt = coalesce(node.createdAt, $ts),
                             node.updatedAt = $ts
                        WITH node
                        MATCH (u:User {id:$user_id})
                        OPTIONAL MATCH (u)-[:OWNS]->(c:Campaign {id:$cid})
                        FOREACH (_ IN CASE WHEN c IS NULL THEN [] ELSE [1] END |
                            MERGE (node)-[:PART_OF]->(c)
                        )
                        MERGE (u)-[:PART_OF]->(node)
                        """,
                        user_id=user_id,
                        cid=cid,
                        fid=ch.entityId,
                        ts=ch.ts,
                        props=props,
                    )

                # ---------- DELETE ----------
                elif ch.op == "delete":
                    _ = query(
                        """
                        MATCH (u:User {id:$user_id})-[:OWNS]->(c:Campaign {id:$cid})
                            <-[:PART_OF]-(f:FOLDER {id:$fid})
                        DETACH DELETE f
                        """,
                        user_id=user_id,
                        cid=cid,
                        fid=ch.entityId,
                    )
            elif ch.entity == "node":

                # ---------- UPDATE ----------
                if ch.op == "update":
                    _ = query(
                        """
                        MATCH (u:User {id:$user_id})-[:OWNS]->(c:Campaign {id:$cid})
                            <-[:PART_OF]-(n {id:$nid})
                        SET   n += $payload,
                            n.updatedAt = $ts
                        """,
                        user_id=user_id,
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
                        MATCH (u:User {id:$user_id})
                        OPTIONAL MATCH (u)-[:OWNS]->(c:Campaign {id:$cid})
                        FOREACH (_ IN CASE WHEN c IS NULL THEN [] ELSE [1] END |
                        MERGE (node)-[:PART_OF]->(c)
                        )
                        MERGE (u)-[:PART_OF]->(node)
                        """,
                        user_id=user_id,
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
                        MATCH (u:User {id:$user_id})-[:OWNS]->(c:Campaign {id:$cid})
                            <-[:PART_OF]-(n {id:$nid})
                        DETACH DELETE n
                        """,
                        user_id=user_id,
                        cid=cid,
                        nid=ch.entityId,
                    )

            # At the end of push_changes function in sync.py:
        from backend.services.sync_hooks import get_sync_embedding_hook

        # After processing all changes, add:
        hook = get_sync_embedding_hook()
        hook.on_sync_changes(changes)

        return {"status": "ok"}

    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


# ───────────────────────────────────────────── incremental updates ──
@router.get("/{cid}/nodes/since/{ts}", response_model=list[Note])
async def get_updates(
    cid: str,
    ts: int,
    user_id: str = Depends(get_current_user),
):
    try:
        records = query(
            """
            MATCH (u:User {id:$user_id})
            OPTIONAL MATCH (u)-[:OWNS]->(c:Campaign {id:$cid})<-[:PART_OF]-(n1)
            OPTIONAL MATCH (u)-[:PART_OF]->(n2)
            WITH coalesce(n1,n2) AS n
            WHERE n.updatedAt > $ts AND NOT n:FOLDER
            WITH n, properties(n) AS props
            RETURN {
              id:        props.id,
              type:      coalesce(props.type, 'Note'),
              title:     coalesce(props.title, props.name, 'Untitled'),
              markdown:  props.markdown,
              updatedAt: coalesce(props.updatedAt, 0),
              createdAt: coalesce(props.createdAt, 0),
              attributes: apoc.map.removeKeys(
                 props,['id','type','title','name','markdown','updatedAt','createdAt']
              )
            } AS node
            """,
            user_id=user_id,
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
    user_id: str = Depends(get_current_user),
):
    """
    Return every relationship touching this user's nodes/campaign whose
    r.updatedAt > ts.  Works no matter what the rel-type is (:MENTIONS, etc.).
    """
    try:
        import uuid
        
        records = query(
            """
            MATCH (u:User {id:$user_id})

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
              id:         props.id,         // we'll handle None values in Python
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
            user_id=user_id,
            cid=None if cid == "global" else cid,
            ts=ts,
        )
        
        # Post-process records to generate UUIDs for None IDs
        result = []
        for r in records:
            edge = r["edge"]
            if edge["id"] is None:
                edge["id"] = f"edge-{str(uuid.uuid4())[:8]}"
            result.append(edge)
        
        return result
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


# ─────────────────────────────────────────────── edges for a node ──
@router.get("/{cid}/node/{nid}/edges", response_model=list[Edge])
async def get_node_edges(
    cid: str,
    nid: str,
    user_id: str = Depends(get_current_user),
):
    try:
        records = query(
            """
            MATCH (u:User {id:$user_id})-[:OWNS]->(c:Campaign {id:$cid})
                <-[:PART_OF]-(n {id:$nid})
            MATCH (n)-[r]-(m)
            WHERE type(r) <> 'CONTAINS'  // Exclude folder relationships
            RETURN {
            id:        r.id,
            from_id:   startNode(r).id,
            to_id:     endNode(r).id,
            from_title:startNode(r).title,
            to_title:  endNode(r).title,
            direction: CASE WHEN startNode(r).id = $nid THEN 'out' ELSE 'in' END,
            relType:   type(r),
            createdAt: properties(r).createdAt,
            updatedAt: r.updatedAt,
            props:     apoc.map.removeKeys(properties(r), ['id','createdAt','updatedAt']),
            target: {
                id:    m.id,
                title: m.title,
                type:  m.type
            }
            } AS edge
            """,
            user_id=user_id,
            cid=cid,
            nid=nid,
        )
        return [r["edge"] for r in records]  # <-- alias is edge
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


# ───────────────────────────────────────────────── folder sync ──
@router.get("/{cid}/folders/since/{ts}", response_model=list[FolderWithChildren])
async def get_folder_updates(
    cid: str,
    ts: int,
    user_id: str = Depends(get_current_user),
):
    try:
        records = query(
            """
            MATCH (u:User {id:$user_id})
            OPTIONAL MATCH (u)-[:OWNS]->(c:Campaign {id:$cid})<-[:PART_OF]-(f:FOLDER)
            OPTIONAL MATCH (u)-[:PART_OF]->(f2:FOLDER)
            WITH coalesce(f, f2) AS folder
            WHERE folder IS NOT NULL AND folder.updatedAt > $ts
            WITH folder, properties(folder) AS props
            
            // Note: CONTAINS relationships will be implemented later
            // For now, return empty arrays to avoid warnings
            WITH folder, props, [] AS noteIds, [] AS childFolderIds
            
            RETURN {
                id: props.id,
                name: props.name,
                parentId: props.parentId,
                position: coalesce(props.position, 0),
                campaignId: props.campaignId,
                ownerId: props.ownerId,
                createdAt: coalesce(props.createdAt, 0),
                updatedAt: coalesce(props.updatedAt, 0),
                noteIds: noteIds,
                childFolderIds: childFolderIds
            } AS folder
            """,
            user_id=user_id,
            cid=cid if cid != "global" else None,
            ts=ts,
        )
        return [r["folder"] for r in records]
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/{cid}/folders", response_model=list[FolderWithChildren])
async def get_all_folders(
    cid: str,
    user_id: str = Depends(get_current_user),
):
    try:
        records = query(
            """
            MATCH (u:User {id:$user_id})
            OPTIONAL MATCH (u)-[:OWNS]->(c:Campaign {id:$cid})<-[:PART_OF]-(f:FOLDER)
            OPTIONAL MATCH (u)-[:PART_OF]->(f2:FOLDER)
            WITH coalesce(f, f2) AS folder
            WHERE folder IS NOT NULL
            WITH folder, properties(folder) AS props
            
            // Get contained notes
            OPTIONAL MATCH (folder)-[:CONTAINS]->(note)
            WHERE NOT note:FOLDER
            WITH folder, props, collect(note.id) AS noteIds
            
            // Get child folders  
            OPTIONAL MATCH (folder)-[:CONTAINS]->(child:FOLDER)
            WITH folder, props, noteIds, collect(child.id) AS childFolderIds
            
            RETURN {
                id: props.id,
                name: props.name,
                parentId: props.parentId,
                position: coalesce(props.position, 0),
                campaignId: props.campaignId,
                ownerId: props.ownerId,
                createdAt: coalesce(props.createdAt, 0),
                updatedAt: coalesce(props.updatedAt, 0),
                noteIds: noteIds,
                childFolderIds: childFolderIds
            } AS folder
            ORDER BY folder.position
            """,
            user_id=user_id,
            cid=cid if cid != "global" else None,
        )
        return [r["folder"] for r in records]
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
