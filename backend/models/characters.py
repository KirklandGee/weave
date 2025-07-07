from datetime import datetime
from pydantic import BaseModel, Field

class Character(BaseModel):
  id: int
  title: str
  createdAt: datetime
  updatedAt: datetime
  level: int
  markdown: str | None
  type: str | None
  class_: str = Field(alias="class")  # Use alias to handle Python keyword conflict