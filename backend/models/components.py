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

    def create_props(self) -> dict[str, Any]:
      return {
          "id": self.metadata.id,
          "createdAt": self.metadata.created_at.isoformat(),
          "updatedAt": self.metadata.updated_at.isoformat(),
          "title": self.content.title,
          "markdown": self.content.markdown,
      }
    def get_label(self) -> str:
      # Default fallback, will be overridden in subclasses
      return self.__class__.__name__

class Change(BaseModel):
    op: str                       # create | update | delete
    entity: Literal["node", "edge"]
    entityId: str
    payload: dict[str, Any]
    ts: int                       # epoch ms

class SidebarNode(BaseModel):
    id: str
    type: str
    title: str
    markdown: str | None = None
    attributes: dict[str, Any] = {}
    updatedAt: int
    createdAt: int

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
    createdAt: int | None         # present in some rows, None in others
    attributes: dict[str, Any] = {}         # what you return as "attributes"