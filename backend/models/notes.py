from typing import override
from backend.models.components import MarkdownNodeBase


class Note(MarkdownNodeBase):

    @override
    def get_label(self) -> str:
        return "Note"
