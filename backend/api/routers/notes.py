from datetime import datetime
import re
import uuid
from typing import List
from fastapi import APIRouter, HTTPException, UploadFile, File
import frontmatter
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


def extract_title_from_markdown(content: str, filename: str) -> str:
    """Extract title from markdown content or fallback to filename."""
    # First try to find H1 header
    h1_match = re.search(r"^#\s+(.+)", content, re.MULTILINE)
    if h1_match:
        return h1_match.group(1).strip()

    # Fallback to filename without extension
    return filename.rsplit(".", 1)[0] if "." in filename else filename


def detect_note_type(content: str, frontmatter_data: dict) -> str:
    """Detect note type from frontmatter or content patterns."""
    # Check frontmatter first
    if "type" in frontmatter_data:
        note_type = frontmatter_data["type"]
        # Validate against known types
        valid_types = [
            "Note",
            "Character",
            "Location",
            "Quest",
            "Event",
            "Session",
            "NPC",
            "Item",
            "Lore",
            "Rule",
        ]
        if note_type in valid_types:
            return note_type

    # Pattern-based detection
    content_lower = content.lower()

    if any(
        keyword in content_lower
        for keyword in ["character", "npc", "personality", "backstory"]
    ):
        return "Character"
    elif any(
        keyword in content_lower
        for keyword in ["location", "place", "city", "town", "region"]
    ):
        return "Location"
    elif any(
        keyword in content_lower
        for keyword in ["quest", "mission", "objective", "goal"]
    ):
        return "Quest"
    elif any(
        keyword in content_lower for keyword in ["event", "happening", "occurrence"]
    ):
        return "Event"
    elif any(
        keyword in content_lower for keyword in ["session", "game session", "adventure"]
    ):
        return "Session"
    elif any(
        keyword in content_lower
        for keyword in ["item", "artifact", "weapon", "armor", "equipment"]
    ):
        return "Item"
    elif any(
        keyword in content_lower
        for keyword in ["lore", "history", "legend", "mythology"]
    ):
        return "Lore"
    elif any(keyword in content_lower for keyword in ["rule", "mechanic", "system"]):
        return "Rule"

    return "Note"  # Default fallback


def extract_internal_links(content: str) -> List[str]:
    """Extract internal wikilink-style references like [[Page Name]]."""
    # Find [[link]] patterns
    wiki_links = re.findall(r"\[\[([^\]]+)\]\]", content)
    return wiki_links


@router.post("/import/markdown", tags=["notes"])
async def import_markdown_files(files: List[UploadFile] = File(...)):
    """Import one or more markdown files and create notes from them."""

    if not files:
        raise HTTPException(status_code=400, detail="No files provided")

    results = []
    errors = []

    for file in files:
        try:
            # Validate file type
            if not file.filename or not file.filename.endswith(".md"):
                errors.append(f"{file.filename or 'unknown'}: Not a markdown file")
                continue

            # Read file content
            content_bytes = await file.read()
            content_str = content_bytes.decode("utf-8")

            # Parse frontmatter
            post = frontmatter.loads(content_str)
            markdown_content = post.content
            frontmatter_data = post.metadata

            # Extract title
            title = extract_title_from_markdown(markdown_content, file.filename)

            # Override title from frontmatter if present
            if "title" in frontmatter_data:
                title = frontmatter_data["title"]

            # Detect note type
            note_type = detect_note_type(markdown_content, frontmatter_data)

            # Extract internal links for future relationship creation
            internal_links = extract_internal_links(markdown_content)

            # Generate unique ID
            note_id = f"imported-{uuid.uuid4().hex[:8]}"

            # Create metadata
            metadata = Metadata(
                id=note_id,
                created_at=datetime.now(),
                updated_at=datetime.now(),
            )

            # Create note content
            note_content = MarkdownContent(title=title, markdown=markdown_content)

            # Create note node
            note_node = Note(content=note_content, metadata=metadata)

            # Build and execute query
            q, params = build_create_query(note_node)
            result = query(q, **params)

            if result:
                note_data = result[0]
                # Add metadata about import
                note_data["imported_from"] = file.filename
                note_data["detected_type"] = note_type
                note_data["internal_links"] = internal_links
                note_data["frontmatter"] = frontmatter_data

                results.append(note_data)
            else:
                errors.append(f"{file.filename}: Failed to create note in database")

        except UnicodeDecodeError:
            errors.append(f"{file.filename or 'unknown'}: Invalid UTF-8 encoding")
        except Exception as e:
            errors.append(f"{file.filename or 'unknown'}: {str(e)}")

    return {
        "message": f"Import completed. {len(results)} notes created, {len(errors)} errors.",
        "created_notes": results,
        "errors": errors,
        "total_files": len(files),
        "successful_imports": len(results),
        "failed_imports": len(errors),
    }


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
