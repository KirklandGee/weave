// Faerûn sessions
CREATE (:Session {id:'sess-fc-1', title:'Session 1 – Gathering Shadows', type:'Session', markdown:'The party meets at Wyvern’s Rest and hears of missing caravans.', createdAt:datetime(), updatedAt:datetime()});
CREATE (:Session {id:'sess-fc-2', title:'Session 2 – Crypt of Echoes',   type:'Session', markdown:'Delving the Shadowfell crypt; undead whispers barter secrets.', createdAt:datetime(), updatedAt:datetime()});
CREATE (:Session {id:'sess-fc-3', title:'Session 3 – Council of Cormyr', type:'Session', markdown:'Audience before Princess Raedra to negotiate aid.',            createdAt:datetime(), updatedAt:datetime()});

// Sword Coast sessions
CREATE (:Session {id:'sess-sc-1', title:'Session 1 – Storm on the Horizon', type:'Session', markdown:'Lightning-lit docks, a smuggling ring exposed.', createdAt:datetime(), updatedAt:datetime()});
CREATE (:Session {id:'sess-sc-2', title:'Session 2 – Into Neverwinter Wood', type:'Session', markdown:'Fey riddles and blighted treants block the path.', createdAt:datetime(), updatedAt:datetime()});
CREATE (:Session {id:'sess-sc-3', title:'Session 3 – The Yawning Depths',     type:'Session', markdown:'Descent through the tavern well into Undermountain.', createdAt:datetime(), updatedAt:datetime()});

// session follow chains
MATCH (a:Session{id:'sess-fc-2'}),(b:Session{id:'sess-fc-1'}) CREATE (a)-[:FOLLOWS]->(b);
MATCH (a:Session{id:'sess-fc-3'}),(b:Session{id:'sess-fc-2'}) CREATE (a)-[:FOLLOWS]->(b);
MATCH (a:Session{id:'sess-sc-2'}),(b:Session{id:'sess-sc-1'}) CREATE (a)-[:FOLLOWS]->(b);
MATCH (a:Session{id:'sess-sc-3'}),(b:Session{id:'sess-sc-2'}) CREATE (a)-[:FOLLOWS]->(b);