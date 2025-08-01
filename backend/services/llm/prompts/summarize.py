from langchain_core.prompts import PromptTemplate
from backend.services.llm.types import TemplateConfig

# Summarize template
summarize_template = """
Please summarize the current note, taking into account any relevant context from the related notes provided.

## Context:
{context}

## Instructions:
1. Provide a clear, concise summary of the main note's key points
2. Incorporate relevant information from related notes where it adds context or clarification
3. Highlight any connections, contradictions, or complementary information between the notes
4. Keep the summary focused on the main note while using related notes to enhance understanding
5. Use clear, accessible language
6. Aim for {length_preference} (e.g., 2-3 paragraphs, bullet points, etc.)

## Summary:
"""

# Create the template configuration
template_config = TemplateConfig(
    name="Summarize Current Note",
    description="Summarize a note with context from related notes",
    required_vars=["context"],
    optional_vars=["length_preference"],
    chain_type="single",
    template=PromptTemplate.from_template(summarize_template),
    system_message="You are an expert note summarizer. Your task is to create a concise, comprehensive summary of a given note while incorporating relevant context from related notes.",
    metadata={
        "category": "content_processing",
        "tags": ["summarization", "notes", "context"],
        "version": "1.0",
    },
)
