// ── Campaign 1: Faerûn in Crisis ─────────────────────────────────────────────
CREATE (:Location {id:'loc-faerun',    title:'Faerûn',                 type:'Realm',   markdown:'A vast continent of diverse nations and looming threats.', createdAt:datetime(), updatedAt:datetime()});
CREATE (:Location {id:'loc-cormyr',    title:'Cormyr',                 type:'Region',  markdown:'The Forest Kingdom—noble courts, purple dragon knights, and restive borders.', createdAt:datetime(), updatedAt:datetime()});
CREATE (:Location {id:'loc-suzail',    title:'Suzail',                 type:'Town',    markdown:'Capital of Cormyr; bustling docks, grand keep, and alleys thick with rumor.', createdAt:datetime(), updatedAt:datetime()});
CREATE (:Location {id:'loc-wyvernrest',title:'Wyvern’s Rest Inn',      type:'POI',     markdown:'A cozy inn where gossip flows as freely as ale.', createdAt:datetime(), updatedAt:datetime()});
CREATE (:Location {id:'loc-shadowcrypt',title:'Haunted Crypts of Shadowfell', type:'POI', markdown:'Ancient tombs where shadows cling to the living.', createdAt:datetime(), updatedAt:datetime()});

// containment
MATCH (small:Location{id:'loc-cormyr'}),(big:Location{id:'loc-faerun'}) CREATE (small)-[:WITHIN]->(big);
MATCH (small:Location{id:'loc-suzail'}),(big:Location{id:'loc-cormyr'}) CREATE (small)-[:WITHIN]->(big);
MATCH (small:Location{id:'loc-wyvernrest'}),(big:Location{id:'loc-suzail'}) CREATE (small)-[:WITHIN]->(big);
MATCH (small:Location{id:'loc-shadowcrypt'}),(big:Location{id:'loc-cormyr'}) CREATE (small)-[:WITHIN]->(big);

// ── Campaign 2: Storm Lords of the Sword Coast ───────────────────────────────
CREATE (:Location {id:'loc-swordcoast',  title:'The Sword Coast',        type:'Realm',  markdown:'A storm-lashed coastline home to trade cities and ancient ruins.', createdAt:datetime(), updatedAt:datetime()});
CREATE (:Location {id:'loc-waterdeep',   title:'Waterdeep',              type:'Town',   markdown:'City of Splendors—cosmopolitan markets above, mad wizardry below.', createdAt:datetime(), updatedAt:datetime()});
CREATE (:Location {id:'loc-neverwinterw',title:'Neverwinter Wood',       type:'Region', markdown:'Ancient forest steeped in Fey energy and lingering plaguefire.', createdAt:datetime(), updatedAt:datetime()});
CREATE (:Location {id:'loc-triboartrail',title:'Triboar Trail',          type:'POI',    markdown:'Rugged merchant road plagued by bandits and owlbears.', createdAt:datetime(), updatedAt:datetime()});
CREATE (:Location {id:'loc-yawningportal',title:'The Yawning Portal',    type:'POI',    markdown:'Legendary tavern built atop the well that drops adventurers into Undermountain.', createdAt:datetime(), updatedAt:datetime()});

// containment
MATCH (small:Location{id:'loc-waterdeep'}),(big:Location{id:'loc-swordcoast'})   CREATE (small)-[:WITHIN]->(big);
MATCH (small:Location{id:'loc-neverwinterw'}),(big:Location{id:'loc-swordcoast'})CREATE (small)-[:WITHIN]->(big);
MATCH (small:Location{id:'loc-triboartrail'}),(big:Location{id:'loc-swordcoast'}) CREATE (small)-[:WITHIN]->(big);
MATCH (small:Location{id:'loc-yawningportal'}),(big:Location{id:'loc-waterdeep'}) CREATE (small)-[:WITHIN]->(big);