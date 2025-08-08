from typing import override, Any
from backend.models.components import MarkdownNodeBase


class Note(MarkdownNodeBase):
    type: str = "note"  # Default type

    @override
    def get_label(self) -> str:
        return "Note"
    
    @override
    def create_props(self) -> dict[str, Any]:
        props = super().create_props()
        props["type"] = self.type
        return props
