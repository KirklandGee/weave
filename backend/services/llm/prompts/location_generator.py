from langchain.prompts import PromptTemplate
from backend.services.llm.types import TemplateConfig

# Location generator template
location_template = """
Create a detailed location based on the provided context and specifications.

## Context:
{context}

## Location Specifications:
**Location Type:** {location_type}
**Scale:** {scale}
**Theme/Atmosphere:** {theme}

## Instructions:
1. Create a unique location that fits naturally into the established world based on the context
2. Ensure consistency with existing locations and their relationships from the context
3. Consider the specified scale: {scale} (e.g., Realm, Region, City, Town, Village, Building, Room)
4. Incorporate the theme/atmosphere: {theme}
5. Include geographical features, climate, and natural resources
6. Describe the inhabitants, culture, and governance
7. Provide notable landmarks and points of interest
8. Include potential adventure hooks and story opportunities
9. Consider economic, political, and social aspects

## Location Details:

### Basic Information:
- **Name:** 
- **Type:** {location_type}
- **Scale:** {scale}
- **Population:** 
- **Notable Features:** 

### Geography & Environment:
[Describe the physical layout, terrain, climate, and natural features]

### History:
[Provide background on how this location came to be and significant historical events]

### Culture & Society:
[Describe the inhabitants, their customs, traditions, and way of life]

### Government & Politics:
[Explain the power structure, leadership, and political dynamics]

### Economy:
[Describe the economic basis, trade, resources, and commerce]

### Notable Locations:
[List and describe important buildings, landmarks, or areas within this location]

### Key NPCs:
[Suggest important figures who might be found here]

### Threats & Challenges:
[Identify potential dangers, conflicts, or problems in this location]

### Adventure Hooks:
[Provide story opportunities and plot hooks related to this location]

### Connections:
[Describe how this location relates to and connects with existing locations]

### Secrets:
[Hidden aspects, mysteries, or secrets that could be discovered]
"""

# Create the template configuration
template_config = TemplateConfig(
    name="location_generator",
    description="Generate detailed locations (realms, regions, cities, towns, etc.) based on context and specifications",
    required_vars=["context", "location_type", "scale"],
    optional_vars=["theme"],
    chain_type="single",
    template=PromptTemplate.from_template(location_template),
    system_message="You are an expert world builder and RPG game master. Create rich, detailed locations that feel lived-in and contribute meaningfully to the game world. Ensure consistency with the established world and provide opportunities for adventure and storytelling.",
    metadata={
        "category": "rpg_content",
        "tags": ["location", "worldbuilding", "geography"],
        "version": "1.0"
    }
)