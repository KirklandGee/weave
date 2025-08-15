from langchain_core.prompts import PromptTemplate
from backend.services.llm.types import TemplateConfig

# Session planner template
session_template = """
Generate session ideas and plot hooks based on the campaign context and session preferences.

## Context:
{context}

## Session Preferences:
**Session Type:** {session_type}
**Duration:** {duration}
**Tone:** {tone}
**Focus:** {focus}

## Instructions:
1. Analyze the context to understand story momentum and character development
2. Consider all player characters and their individual goals, backgrounds, and relationships from the context
3. Incorporate relevant NPCs and their motivations into the session planning
4. Build upon existing story threads and plot hooks from the context
5. Create sessions that match the requested type: {session_type} (e.g., combat, roleplay, exploration, mystery, social)
6. Design for the specified duration: {duration}
7. Match the desired tone: {tone}
8. Focus on the specified aspect: {focus}
9. Provide multiple session options with different approaches
10. Include both immediate scenes and longer-term story implications

## Session Ideas:

### Session Option 1: [Title]
**Overview:** [Brief description of the session's main premise]

**Opening Scene:** [How the session begins]

**Key Encounters:** 
- [Encounter 1 with difficulty and purpose]
- [Encounter 2 with difficulty and purpose]
- [Encounter 3 with difficulty and purpose]

**Character Moments:** [Opportunities for individual character development]

**Story Progression:** [How this session advances the overall campaign]

**Potential Outcomes:** [Different ways the session could end]

---

### Session Option 2: [Title]
**Overview:** [Brief description of the session's main premise]

**Opening Scene:** [How the session begins]

**Key Encounters:** 
- [Encounter 1 with difficulty and purpose]
- [Encounter 2 with difficulty and purpose]
- [Encounter 3 with difficulty and purpose]

**Character Moments:** [Opportunities for individual character development]

**Story Progression:** [How this session advances the overall campaign]

**Potential Outcomes:** [Different ways the session could end]

---

### Session Option 3: [Title]
**Overview:** [Brief description of the session's main premise]

**Opening Scene:** [How the session begins]

**Key Encounters:** 
- [Encounter 1 with difficulty and purpose]
- [Encounter 2 with difficulty and purpose]
- [Encounter 3 with difficulty and purpose]

**Character Moments:** [Opportunities for individual character development]

**Story Progression:** [How this session advances the overall campaign]

**Potential Outcomes:** [Different ways the session could end]

---

## Session Planning Tools:

### Preparation Checklist:
- [ ] NPCs needed and their motivations
- [ ] Maps or locations required
- [ ] Props or handouts to prepare
- [ ] Rule clarifications or special mechanics
- [ ] Backup encounters if things go quickly

### Pacing Guidelines:
- **Opening (15-20 minutes):** [Recap and scene setting]
- **Early Game (45-60 minutes):** [Main encounter or story development]
- **Mid Game (45-60 minutes):** [Secondary encounters or roleplay]
- **Late Game (30-45 minutes):** [Climax and resolution]
- **Closing (10-15 minutes):** [Wrap-up and next session preview]

### Character Integration:
[Specific ways to highlight each player character's unique abilities and story]

### Contingency Plans:
[What to do if players go off-script or sessions run long/short]
"""

# Create the template configuration
template_config = TemplateConfig(
    name="Plan Your Next Session",
    description="Generate detailed session plans and ideas based on campaign context and preferences",
    required_vars=["context"],
    optional_vars=["session_type", "duration", "tone", "focus"],
    chain_type="single",
    template=PromptTemplate.from_template(session_template),
    system_message="You are an expert RPG game master. Create engaging, practical session plans that advance the story and highlight each player character. Focus on actionable content and clear structure.",
    metadata={
        "category": "rpg_content",
        "tags": ["session_planning", "gamemaster", "story_development"],
        "version": "1.0",
    },
)
