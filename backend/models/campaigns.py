from typing import override
from pydantic import Field
from backend.models.components import MarkdownNodeBase

class Campaign(MarkdownNodeBase):
  type: str  = Field(default='Campaign')
  
  @override
  def get_label(self) -> str:
    return "Campaign"
