from typing import Any
from datetime import datetime
from pydantic import BaseModel


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

    def to_cypher_dict(self) -> dict[str, Any]:
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
