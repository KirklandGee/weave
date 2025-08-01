from typing import Dict, Any, Optional
from pydantic import BaseModel, Field
from langchain_core.prompts import PromptTemplate


class TemplateConfig(BaseModel):
    """Configuration for a prompt template."""

    name: str
    description: str
    required_vars: list[str] = Field(default_factory=list)
    optional_vars: list[str] = Field(default_factory=list)
    chain_type: str = Field(default="single", description="single or multi")
    template: PromptTemplate
    system_message: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
    chain_steps: Optional[list[Dict[str, Any]]] = Field(
        default=None, description="For multi-step chains"
    )


class ChainStep(BaseModel):
    """Represents a single step in a multi-step chain."""

    name: str
    template: PromptTemplate
    output_key: str
    system_message: Optional[str] = None
    depends_on: Optional[list[str]] = Field(default_factory=list)
