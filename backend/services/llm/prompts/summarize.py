
"""
## Usage Instructions

### Required Variables:
- `[NOTE_TITLE]`: Title of the main note being summarized
- `[NOTE_CONTENT]`: Full content of the main note in markdown format
- `[RELATED_NOTE_TITLE]`: Title of each related note
- `[RELATED_NOTE_CONTENT]`: Content of each related note
- `[LENGTH_PREFERENCE]`: Desired summary length/format

### Optional Customizations:
- Add specific domain expertise if needed (e.g., "You are a medical expert..." for medical notes)
- Include specific formatting requirements
- Add constraints about what to focus on or avoid
- Specify the intended audience for the summary
"""

system_message = """
You are an expert note summarizer. Your task is to create a concise, comprehensive summary of a given note while incorporating relevant context from related notes.
"""

user_message = """
Please summarize the following note, taking into account any relevant context from the related notes provided.

## Current Note to Summarize:
**Title:** [NOTE_TITLE]
**Content:**
[NOTE_CONTENT]

## Related Notes for Context:
[For each related note, include:]

### Related Note [N]: [RELATED_NOTE_TITLE]
[RELATED_NOTE_CONTENT]

---

## Instructions:
1. Provide a clear, concise summary of the main note's key points
2. Incorporate relevant information from related notes where it adds context or clarification
3. Highlight any connections, contradictions, or complementary information between the notes
4. Keep the summary focused on the main note while using related notes to enhance understanding
5. Use clear, accessible language
6. Aim for [LENGTH_PREFERENCE] (e.g., 2-3 paragraphs, bullet points, etc.)

## Summary:
"""