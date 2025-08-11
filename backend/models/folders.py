from pydantic import BaseModel
from typing import Any
from datetime import datetime


class Folder(BaseModel):
    id: str
    name: str
    parentId: str | None = None
    position: int
    campaignId: str
    ownerId: str
    createdAt: int
    updatedAt: int


class FolderWithChildren(BaseModel):
    id: str
    name: str
    parentId: str | None = None
    position: int
    campaignId: str
    ownerId: str
    createdAt: int
    updatedAt: int
    noteIds: list[str] = []
    childFolderIds: list[str] = []