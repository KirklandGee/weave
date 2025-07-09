from datetime import datetime
from fastapi import APIRouter, HTTPException
from backend.models.notes import Note 
from backend.models.components import MarkdownContent, Metadata
from backend.services.neo4j import query
from backend.services.neo4j.queries import build_create_query

router = APIRouter()


@router.get("/note", tags=["notes"])
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


@router.get("/notes", tags=["notes"])
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


@router.post("/note", tags=["notes"])
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


@router.delete("/note", tags=["notes"])
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


