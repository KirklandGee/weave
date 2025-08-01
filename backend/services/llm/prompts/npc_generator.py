from langchain_core.prompts import PromptTemplate
from backend.services.llm.types import TemplateConfig

# NPC generator template
npc_template = """
Create a detailed NPC (Non-Player Character) based on the provided context and character specifications.

## Context:
{context}

## Character Specifications:
**Character Type:** {character_type}
**Personality Traits:** {personality_traits}

## Instructions:
1. Create a unique NPC that fits naturally into the world based on the context provided
2. Ensure the character type ({character_type}) is accurately represented
3. Use the context to make the NPC contextually appropriate to the current location/situation
4. Incorporate the specified personality traits: {personality_traits}
5. Include background story, motivations, and goals
6. Provide physical description and distinctive features
7. Include potential plot hooks or quest opportunities
8. Suggest how this NPC might interact with player characters

## NPC Details:

### Basic Information:
- **Name:** 
- **Race/Species:** 
- **Age:** 
- **Occupation/Role:** 
- **Location:** 

### Physical Description:
[Provide detailed physical appearance, clothing, and distinctive features]

### Personality:
[Describe personality traits, mannerisms, speech patterns, and behavioral quirks]

### Background:
[Provide rich backstory including origins, significant events, and current situation]

### Motivations & Goals:
[What drives this character? What are their short-term and long-term objectives?]

### Relationships:
[Important relationships with other characters, factions, or organizations]

### Plot Hooks:
[Potential ways this NPC could interact with player characters or drive story elements]

### Secrets:
[Hidden information that could be revealed through roleplay or investigation]

### Game Statistics:
[Relevant mechanical information if needed for gameplay]
"""

# Create the template configuration
template_config = TemplateConfig(
    name="Create an NPC",
    description="Generate detailed NPCs based on context and character specifications",
    required_vars=["context", "character_type"],
    optional_vars=["personality_traits"],
    chain_type="single",
    template=PromptTemplate.from_template(npc_template),
    system_message="You are an expert RPG game master and storyteller. Create rich, detailed NPCs that feel alive and contribute meaningfully to the game world. Draw inspiration from the context provided and ensure consistency with the established world.",
    metadata={
        "category": "rpg_content",
        "tags": ["npc", "character_creation", "worldbuilding"],
        "version": "1.0",
    },
)
