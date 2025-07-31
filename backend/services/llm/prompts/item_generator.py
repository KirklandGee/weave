from langchain_core.prompts import PromptTemplate
from backend.services.llm.types import TemplateConfig

# Item generator template
item_template = """
Create a unique and special item based on the provided context.

## Context:
{context}

## Item Specifications:
**Item Type:** {item_type}
**Rarity/Power Level:** {rarity}
**Purpose:** {purpose}

## Instructions:
1. Create a unique item that is perfectly suited to the context provided
2. Draw inspiration from the relationships and context to make the item meaningful
3. Consider the item type: {item_type} (e.g., weapon, armor, tool, accessory, consumable, artifact)
4. Match the rarity/power level: {rarity}
5. Ensure the item serves its intended purpose: {purpose}
6. Include rich backstory and lore that connects to the context
7. Provide both mechanical and narrative significance
8. Consider how the item might be obtained or discovered
9. Include any special properties, abilities, or quirks

## Item Details:

### Basic Information:
- **Name:** 
- **Type:** {item_type}
- **Rarity:** {rarity}
- **Value:** 
- **Weight:** 

### Physical Description:
[Provide detailed appearance, materials, craftsmanship, and distinctive features]

### History & Origin:
[Describe how this item came to be, who created it, and its journey through time]

### Connection to Context:
[Explain how this item relates to the character/location and their relationships]

### Mechanical Properties:
[Game statistics, abilities, bonuses, or effects]

### Special Abilities:
[Unique powers, enchantments, or magical properties]

### Lore & Significance:
[Cultural, historical, or mythological importance]

### Acquisition:
[How might player characters discover, earn, or obtain this item?]

### Drawbacks or Costs:
[Any negative aspects, requirements, or prices for using this item]

### Plot Hooks:
[Story opportunities or adventures that could arise from this item]

### Secrets:
[Hidden properties, history, or abilities that might be discovered later]
"""

# Create the template configuration
template_config = TemplateConfig(
    name="Create New Item",
    description="Generate unique magical items, weapons, or artifacts based on context",
    required_vars=["context", "item_type"],
    optional_vars=["rarity", "purpose"],
    chain_type="single",
    template=PromptTemplate.from_template(item_template),
    system_message="You are an expert RPG game master and item designer. Create unique, memorable items that serve both mechanical and narrative purposes. Ensure each item feels special and meaningful within the context of the game world.",
    metadata={
        "category": "rpg_content",
        "tags": ["item", "equipment", "artifact", "treasure"],
        "version": "1.0"
    }
)
