// Create Users and proper relationships for tool-calling functionality

// REPLACE WITH YOUR OWN USER: Change 'YOUR_CLERK_USER_ID' to your actual Clerk user ID
// You can find this in your Clerk dashboard or by checking the user object in your app
MERGE (u:User {id: 'YOUR_CLERK_USER_ID'})
ON CREATE SET 
  u.clerk_id = 'YOUR_CLERK_USER_ID', // ← Replace this with your actual Clerk user ID
  u.created_at = datetime(),
  u.updated_at = datetime()
ON MATCH SET 
  u.updated_at = datetime();

// Create a demo user for testing
MERGE (u:User {id: 'demo-user'})
ON CREATE SET 
  u.clerk_id = 'demo-user',
  u.created_at = datetime(),
  u.updated_at = datetime()
ON MATCH SET 
  u.updated_at = datetime();

// Update existing campaigns to have ownership relationships
MATCH (c:Campaign {id: 'camp-faerun-crisis'})
MATCH (u:User {id: 'YOUR_CLERK_USER_ID'}) // ← Make sure this matches your user ID above
MERGE (u)-[:OWNS]->(c);

MATCH (c:Campaign {id: 'camp-storm-lords'})
MATCH (u:User {id: 'demo-user'})
MERGE (u)-[:OWNS]->(c);

// Update the seed.cql campaign to have ownership
MATCH (c:Campaign {id: 'campaign-1'})
MATCH (u:User {id: 'demo-user'})
MERGE (u)-[:OWNS]->(c);

// Create some sample notes for testing tool functionality
MERGE (n1:Note {id: 'note-dragon-encounter'})
ON CREATE SET 
  n1.title = 'Ancient Red Dragon Encounter',
  n1.type = 'Note',
  n1.markdown = '## Ancient Red Dragon - Pyraxes the Eternal\n\n**Location**: Ember Peak Volcano\n**Challenge Rating**: 24\n\n### Description\nPyraxes is an ancient red dragon who has claimed the volcanic peak as his domain for over 800 years. His hoard contains artifacts from fallen kingdoms.\n\n### Combat Notes\n- Breath Weapon: 90-foot cone of fire (26d6 damage)\n- Legendary Actions: 3 per turn\n- Lair Actions: Volcanic eruptions, lava flows\n\n### Treasure\n- Crown of the Flame Lords\n- 50,000 gold pieces\n- Magical weapons and armor',
  n1.created_at = datetime(),
  n1.updated_at = datetime();

MERGE (n2:Note {id: 'note-tavern-info'})
ON CREATE SET 
  n2.title = 'The Prancing Pony Tavern',
  n2.type = 'Location',
  n2.markdown = '## The Prancing Pony\n\n**Location**: Crossroads Village\n**Proprietor**: Barliman Butterbur\n\n### Description\nA cozy roadside inn that serves as a gathering place for travelers and adventurers. The common room is always filled with stories and rumors.\n\n### Notable NPCs\n- **Barliman Butterbur**: Innkeeper, friendly but forgetful\n- **Nob**: Stable boy, knows local gossip\n- **Bob**: Cook, makes excellent stew\n\n### Current Rumors\n- Strange lights seen near the old ruins\n- Merchant caravans going missing on the eastern road\n- A hooded figure asking about ancient artifacts',
  n2.created_at = datetime(),
  n2.updated_at = datetime();

MERGE (n3:Note {id: 'note-magic-items'})
ON CREATE SET 
  n3.title = 'Discovered Magic Items',
  n3.type = 'Item',
  n3.markdown = '## Magic Items Found\n\n### Sword of Flame Tongue\n- **Type**: Longsword +1\n- **Properties**: Can ignite to deal +2d6 fire damage\n- **Command Word**: "Ignis"\n- **Found**: Ancient dragon hoard\n\n### Cloak of Elvenkind\n- **Type**: Wondrous item\n- **Properties**: Advantage on stealth, hard to spot\n- **Found**: Elven ruins in Silverleaf Forest\n\n### Potion of Greater Healing\n- **Type**: Potion\n- **Properties**: Restores 4d4+4 hit points\n- **Quantity**: 3 remaining',
  n3.created_at = datetime(),
  n3.updated_at = datetime();

// Connect notes to campaigns with PART_OF relationships
MATCH (n:Note {id: 'note-dragon-encounter'}), (c:Campaign {id: 'camp-faerun-crisis'})
MERGE (n)-[:PART_OF]->(c);

MATCH (n:Note {id: 'note-tavern-info'}), (c:Campaign {id: 'camp-faerun-crisis'})
MERGE (n)-[:PART_OF]->(c);

MATCH (n:Note {id: 'note-magic-items'}), (c:Campaign {id: 'camp-storm-lords'})
MERGE (n)-[:PART_OF]->(c);

// Create sample usage events for testing usage tracking
CREATE (ue1:UsageEvent {
  id: 'usage-1',
  user_id: 'YOUR_CLERK_USER_ID', // ← Replace with your actual Clerk user ID
  model: 'claude-3-sonnet',
  timestamp: datetime('2024-01-15T10:30:00Z'),
  tokens: 1250,
  campaign_id: 'camp-faerun-crisis'
});

CREATE (ue2:UsageEvent {
  id: 'usage-2',
  user_id: 'YOUR_CLERK_USER_ID', // ← Replace with your actual Clerk user ID
  model: 'claude-3-haiku',
  timestamp: datetime('2024-01-15T14:20:00Z'),
  tokens: 800,
  campaign_id: 'camp-faerun-crisis'
});

CREATE (ue3:UsageEvent {
  id: 'usage-3',
  user_id: 'demo-user',
  model: 'claude-3-sonnet',
  timestamp: datetime('2024-01-16T09:15:00Z'),
  tokens: 2100,
  campaign_id: 'camp-storm-lords'
});