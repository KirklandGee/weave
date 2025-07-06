// Faerûn campaign maps
CREATE (:Map {id:'map-faerun',   title:'Map of Faerûn',     imageUrl:'https://example.com/maps/faerun.jpg',  markdown:'A cloth map showing the breadth of the continent.', type:'Map', createdAt:datetime(), updatedAt:datetime()});
CREATE (:Map {id:'map-cormyr',   title:'Map of Cormyr',     imageUrl:'https://example.com/maps/cormyr.jpg',  markdown:'Purple dragon crests mark key keeps.',            type:'Map', createdAt:datetime(), updatedAt:datetime()});
CREATE (:Map {id:'map-suzail',   title:'Street Plan of Suzail', imageUrl:'https://example.com/maps/suzail.jpg', markdown:'Narrow streets and hidden smuggler tunnels.',     type:'Map', createdAt:datetime(), updatedAt:datetime()});

// Sword Coast campaign maps
CREATE (:Map {id:'map-swordcoast', title:'Chart of the Sword Coast', imageUrl:'https://example.com/maps/swordcoast.jpg', markdown:'Sea routes, reefs, and rumored dragon nests.', type:'Map', createdAt:datetime(), updatedAt:datetime()});
CREATE (:Map {id:'map-waterdeep',  title:'Waterdeep Ward Map',       imageUrl:'https://example.com/maps/waterdeep.jpg',  markdown:'Wards, guild emblems, and sewer access points.', type:'Map', createdAt:datetime(), updatedAt:datetime()});
CREATE (:Map {id:'map-yawning',    title:'The Yawning Portal Cross-Section', imageUrl:'https://example.com/maps/yawningportal.jpg', markdown:'A cutaway view down to Undermountain Level 1.', type:'Map', createdAt:datetime(), updatedAt:datetime()});

// connect maps to depicted locations
MATCH (m:Map{id:'map-faerun'}),(l:Location{id:'loc-faerun'})            CREATE (m)-[:DEPICTS]->(l);
MATCH (m:Map{id:'map-cormyr'}),(l:Location{id:'loc-cormyr'})            CREATE (m)-[:DEPICTS]->(l);
MATCH (m:Map{id:'map-suzail'}),(l:Location{id:'loc-suzail'})            CREATE (m)-[:DEPICTS]->(l);
MATCH (m:Map{id:'map-swordcoast'}),(l:Location{id:'loc-swordcoast'})    CREATE (m)-[:DEPICTS]->(l);
MATCH (m:Map{id:'map-waterdeep'}),(l:Location{id:'loc-waterdeep'})      CREATE (m)-[:DEPICTS]->(l);
MATCH (m:Map{id:'map-yawning'}),(l:Location{id:'loc-yawningportal'})    CREATE (m)-[:DEPICTS]->(l);