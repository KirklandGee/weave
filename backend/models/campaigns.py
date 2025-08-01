from typing import Any, override
from pydantic import Field
from backend.models.components import MarkdownNodeBase


class Campaign(MarkdownNodeBase):
    type: str = Field(default="Campaign")

    @override
    def get_label(self) -> str:
        return "Campaign"

    @override
    def create_props(self) -> dict[str, Any]:
        props = super().create_props()
        props["type"] = self.type
        return props
