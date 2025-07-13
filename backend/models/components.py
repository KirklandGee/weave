from typing import Any, Literal
from datetime import datetime
from pydantic import BaseModel, Field


class Metadata(BaseModel):
    id: str
    created_at: datetime
    updated_at: datetime


class MarkdownContent(BaseModel):
    title: str
    markdown: str | None


class MarkdownNodeBase(BaseModel):
    metadata: Metadata
    content: MarkdownContent
    embedding: list[float] | None = None

    def create_props(self) -> dict[str, Any]:
        props = {
            "id": self.metadata.id,
            "createdAt": self.metadata.created_at.isoformat(),
            "updatedAt": self.metadata.updated_at.isoformat(),
            "title": self.content.title,
            "markdown": self.content.markdown,
        }

        # Only include embedding if it exists
        if self.embedding is not None:
            props["embedding"] = self.embedding

        return props

    def get_embedding_text(self) -> str:
        """Get the text that should be embedded for this node."""
        # Combine title and markdown for embedding
        parts = []
        if self.content.title:
            parts.append(self.content.title)
        if self.content.markdown:
            parts.append(self.content.markdown)
        return "\n".join(parts)

    def get_label(self) -> str:
        # Default fallback, will be overridden in subclasses
        return self.__class__.__name__


class Change(BaseModel):
    op: str  # create | update | delete
    entity: Literal["node", "edge"]
    entityId: str
    payload: dict[str, Any]
    ts: int  # epoch ms


class Note(BaseModel):
    id: str
    type: str
    title: str
    markdown: str | None = None
    attributes: dict[str, Any] = {}
    updatedAt: int
    createdAt: int
    embedded_at: datetime | None = None


class Target(BaseModel):
    id: str
    title: str
    type: str


class Edge(BaseModel):
    id: str
    from_id: str
    to_id: str
    from_title: str
    to_title: str
    relType: str
    updatedAt: int
    createdAt: int | None  # present in some rows, None in others
    attributes: dict[str, Any] = {}  # what you return as "attributes"