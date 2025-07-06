// Clear existing data (for dev/testing only — be careful in prod!)
MATCH (n)
DETACH DELETE n;

// Create a campaign
CREATE (c:Campaign {id: "campaign-1", title: "Shadow of the Fell King"});

// Create locations
CREATE
  (l1:Location
    {
      id: "loc-shadowfell",
      name: "Shadowfell Keep",
      region: "Western Vale",
      markdown: "An ancient ruin now inhabited by dark forces."
    });

// Create sessions
CREATE
  (s1:Session
    {
      id: "session-1",
      title: "Arrival at the Keep",
      markdown: "The party arrives at Shadowfell Keep and encounters Serana."
    }),
  (s2:Session
    {
      id: "session-2",
      title: "The Forgotten Crypt",
      markdown: "The players descend into the crypt beneath the keep."
    });

// Create NPCs
CREATE
  (npc1:NPC
    {
      id: "npc-serana",
      name: "Serana",
      faction: "Order of Shadows",
      markdown: "A mysterious sorceress who guards the entrance to the crypt."
    }),
  (npc2:NPC
    {
      id: "npc-baldric",
      name: "Baldric",
      faction: "City Guard",
      markdown: "A gruff guard who guided the party to the Keep."
    });

// Create player characters
CREATE
  (pc1:Character
    {
      id: "pc-alric",
      name: "Alric the Flame",
      class: "Wizard",
      race: "Half-Elf",
      markdown: "Alric seeks forbidden knowledge lost to time."
    }),
  (pc2:Character
    {
      id: "pc-vana",
      name: "Vana Stormroot",
      class: "Druid",
      race: "Firbolg",
      markdown: "Vana communes with spirits of the fallen woods."
    });

// Create relationships
// Sessions belong to campaign
MATCH
  (c:Campaign {id: "campaign-1"}),
  (s1:Session {id: "session-1"}),
  (s2:Session {id: "session-2"})
CREATE (c)-[:CONTAINS]->(s1), (c)-[:CONTAINS]->(s2);

// NPCs involved in sessions
MATCH
  (s1:Session {id: "session-1"}),
  (s2:Session {id: "session-2"}),
  (npc1:NPC {id: "npc-serana"}),
  (npc2:NPC {id: "npc-baldric"})
CREATE (s1)-[:INVOLVES]->(npc2), (s2)-[:INVOLVES]->(npc1);

// Characters involved in sessions
MATCH
  (s1:Session {id: "session-1"}),
  (s2:Session {id: "session-2"}),
  (pc1:Character {id: "pc-alric"}),
  (pc2:Character {id: "pc-vana"})
CREATE (s1)-[:INVOLVES]->(pc1), (s2)-[:INVOLVES]->(pc2);

// NPC relationships
MATCH (npc1:NPC {id: "npc-serana"}), (npc2:NPC {id: "npc-baldric"})
CREATE (npc2)-[:KNOWS]->(npc1);

// Locations visited
MATCH
  (l1:Location {id: "loc-shadowfell"}),
  (npc1:NPC {id: "npc-serana"}),
  (pc1:Character {id: "pc-alric"})
CREATE (npc1)-[:VISITED]->(l1), (pc1)-[:VISITED]->(l1);

// Sessions occurred at location
MATCH
  (s1:Session {id: "session-1"}),
  (s2:Session {id: "session-2"}),
  (l1:Location {id: "loc-shadowfell"})
CREATE (s1)-[:OCCURS_IN]->(l1), (s2)-[:OCCURS_IN]->(l1);