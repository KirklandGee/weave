from langchain.prompts import PromptTemplate
from backend.services.llm.types import TemplateConfig

# Basic template for general purpose use
basic_template = """
## Context:
{context}

## Query:
{query}
"""

# Create the template configuration
template_config = TemplateConfig(
    name="basic",
    description="Basic template for general purpose LLM interactions with context",
    required_vars=["context", "query"],
    optional_vars=[],
    chain_type="single",
    template=PromptTemplate.from_template(basic_template),
    system_message="You are a helpful AI assistant. Use the provided context to respond to the user's query in a clear, accurate, and helpful manner.",
    metadata={
        "category": "general",
        "tags": ["basic", "general_purpose"],
        "version": "1.0"
    }
)