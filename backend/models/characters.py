from typing import override, Any
from pydantic import Field
from backend.models.components import MarkdownNodeBase


class Character(MarkdownNodeBase):
    type: str = Field(default="Character")
    level: int
    class_: str = Field(alias="class")

    @override
    def get_label(self) -> str:
        return "Character"

    @override
    def create_props(self) -> dict[str, Any]:
        props = super().create_props()
        props["level"] = self.level
        props["class"] = self.class_
        props["type"] = self.type
        return props
