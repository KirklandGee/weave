// ==========================================================================
// RELATIONSHIPS
// ==========================================================================
// 1. Attach ALL nodes to their campaigns
// --------------------------------------------------------------------------
MATCH (c:Campaign{id:'camp-faerun-crisis'}),
      (n) WHERE n.id IN [
        // sessions
        'sess-fc-1','sess-fc-2','sess-fc-3',
        // characters
        'char-elira','char-talia','char-dorgan','char-fenric',
        // NPCs (10)
        'npc-ivar','npc-sera','npc-bork','npc-keld','npc-lira','npc-haggra',
        'npc-garrik','npc-zenya','npc-thom','npc-vyktor',
        // locations
        'loc-faerun','loc-cormyr','loc-suzail','loc-wyvernrest','loc-shadowcrypt',
        // maps
        'map-faerun','map-cormyr','map-suzail',
        // notes (7)
        'note-001','note-002','note-003','note-004','note-005','note-006','note-007'
      ]
MERGE (n)-[:PART_OF]->(c);

MATCH (c:Campaign{id:'camp-storm-lords'}),
      (n) WHERE n.id IN [
        // sessions
        'sess-sc-1','sess-sc-2','sess-sc-3',
        // characters
        'char-elira','char-talia','char-magnus','char-kaelin',
        // NPCs (10)
        'npc-volo','npc-reya','npc-krieg','npc-marish','npc-selene','npc-orryk',
        'npc-cruach','npc-loralei','npc-bartleby','npc-viessa',
        // locations
        'loc-swordcoast','loc-waterdeep','loc-neverwinterw','loc-triboartrail','loc-yawningportal',
        // maps
        'map-swordcoast','map-waterdeep','map-yawning',
        // notes (8)
        'note-008','note-009','note-010','note-011','note-012','note-013','note-014','note-015'
      ]
MERGE (n)-[:PART_OF]->(c);

// ==========================================================================
// 2. Session chronology (FOLLOWS chains)
// --------------------------------------------------------------------------
MATCH (a:Session{id:'sess-fc-2'}),(b:Session{id:'sess-fc-1'}) MERGE (a)-[:FOLLOWS]->(b);
MATCH (a:Session{id:'sess-fc-3'}),(b:Session{id:'sess-fc-2'}) MERGE (a)-[:FOLLOWS]->(b);
MATCH (a:Session{id:'sess-sc-2'}),(b:Session{id:'sess-sc-1'}) MERGE (a)-[:FOLLOWS]->(b);
MATCH (a:Session{id:'sess-sc-3'}),(b:Session{id:'sess-sc-2'}) MERGE (a)-[:FOLLOWS]->(b);

// ==========================================================================
// 3. Character origins
// --------------------------------------------------------------------------
MATCH (ch:Character{id:'char-dorgan'}),(l:Location{id:'loc-suzail'})       MERGE (ch)-[:FROM]->(l);
MATCH (ch:Character{id:'char-fenric'}),(l:Location{id:'loc-wyvernrest'})   MERGE (ch)-[:FROM]->(l);
MATCH (ch:Character{id:'char-magnus'}),(l:Location{id:'loc-waterdeep'})    MERGE (ch)-[:FROM]->(l);
MATCH (ch:Character{id:'char-elira'}),(l:Location{id:'loc-neverwinterw'})  MERGE (ch)-[:FROM]->(l);

// ==========================================================================
// 4. NPC residences
// --------------------------------------------------------------------------
UNWIND [
  // Faerûn NPCs
  ['npc-ivar','loc-suzail'],
  ['npc-sera','loc-cormyr'],
  ['npc-bork','loc-shadowcrypt'],
  ['npc-keld','loc-suzail'],
  ['npc-lira','loc-cormyr'],
  ['npc-haggra','loc-shadowcrypt'],
  ['npc-garrik','loc-cormyr'],
  ['npc-zenya','loc-shadowcrypt'],
  ['npc-thom','loc-wyvernrest'],
  ['npc-vyktor','loc-suzail'],
  // Sword-Coast NPCs
  ['npc-volo','loc-waterdeep'],
  ['npc-reya','loc-triboartrail'],
  ['npc-krieg','loc-yawningportal'],
  ['npc-marish','loc-waterdeep'],
  ['npc-selene','loc-waterdeep'],
  ['npc-orryk','loc-waterdeep'],
  ['npc-cruach','loc-swordcoast'],
  ['npc-loralei','loc-swordcoast'],
  ['npc-bartleby','loc-yawningportal'],
  ['npc-viessa','loc-neverwinterw']
] AS pair
MATCH (n:NPC{id:pair[0]}),(l:Location{id:pair[1]})
MERGE (n)-[:LIVES_IN]->(l);

// ==========================================================================
// 5. Session → Location (OCCURS_IN)
// --------------------------------------------------------------------------
UNWIND [
  ['sess-fc-1','loc-wyvernrest'],
  ['sess-fc-2','loc-shadowcrypt'],
  ['sess-fc-3','loc-suzail'],
  ['sess-sc-1','loc-waterdeep'],
  ['sess-sc-2','loc-neverwinterw'],
  ['sess-sc-3','loc-yawningportal']
] AS pair
MATCH (s:Session{id:pair[0]}),(l:Location{id:pair[1]})
MERGE (s)-[:OCCURS_IN]->(l);

// ==========================================================================
// 6. Session casts (INVOLVES characters & NPCs)
// --------------------------------------------------------------------------
UNWIND [
  // Faerûn sessions
  ['sess-fc-1','char-elira'],   ['sess-fc-1','char-dorgan'],
  ['sess-fc-1','npc-ivar'],     ['sess-fc-1','npc-keld'],    ['sess-fc-1','npc-thom'],

  ['sess-fc-2','char-elira'],   ['sess-fc-2','char-fenric'],
  ['sess-fc-2','npc-bork'],     ['sess-fc-2','npc-zenya'],   ['sess-fc-2','npc-haggra'],

  ['sess-fc-3','char-talia'],   ['sess-fc-3','char-dorgan'],
  ['sess-fc-3','npc-sera'],     ['sess-fc-3','npc-lira'],    ['sess-fc-3','npc-garrik'],

  // Sword-Coast sessions
  ['sess-sc-1','char-magnus'],  ['sess-sc-1','char-elira'],
  ['sess-sc-1','npc-volo'],     ['sess-sc-1','npc-marish'],  ['sess-sc-1','npc-selene'],

  ['sess-sc-2','char-kaelin'],  ['sess-sc-2','char-talia'],
  ['sess-sc-2','npc-reya'],     ['sess-sc-2','npc-orryk'],   ['sess-sc-2','npc-cruach'],

  ['sess-sc-3','char-magnus'],  ['sess-sc-3','char-kaelin'],
  ['sess-sc-3','npc-krieg'],    ['sess-sc-3','npc-bartleby'],['sess-sc-3','npc-viessa']
] AS pair
MATCH (s:Session{id:pair[0]}),(p {id:pair[1]})
MERGE (s)-[:INVOLVES]->(p);

// ==========================================================================
// 7. Social graph (KNOWS edges)
// --------------------------------------------------------------------------
UNWIND [
  // original trio
  ['npc-ivar','char-elira'],
  ['npc-volo','npc-krieg'],
  ['char-magnus','npc-reya'],
  // new ties
  ['npc-lira','npc-ivar'],
  ['npc-thom','npc-bork'],
  ['npc-selene','npc-volo'],
  ['char-kaelin','npc-selene']
] AS pair
MATCH (a {id:pair[0]}),(b {id:pair[1]})
MERGE (a)-[:KNOWS]->(b);

// ==========================================================================
// 8. Notes → entity mentions
// --------------------------------------------------------------------------
UNWIND [
  // Faerûn notes
  ['note-001','npc-bork'],           ['note-001','loc-wyvernrest'],
  ['note-002','loc-shadowcrypt'],
  ['note-003','sess-fc-3'],
  ['note-004','npc-garrik'],         ['note-004','loc-cormyr'],
  ['note-005','npc-garrik'],         ['note-005','npc-bork'],
  ['note-006','npc-haggra'],         ['note-006','char-elira'],
  ['note-007','loc-shadowcrypt'],

  // Sword-Coast notes
  ['note-008','npc-viessa'],         ['note-008','loc-neverwinterw'],
  ['note-009','loc-neverwinterw'],
  ['note-010','loc-triboartrail'],
  ['note-011','loc-yawningportal'],
  ['note-012','npc-orryk'],
  ['note-013','npc-viessa'],         ['note-013','npc-cruach'],
  ['note-014','npc-vyktor'],         ['note-014','npc-volo'], ['note-014','loc-waterdeep'],
  ['note-015','npc-cruach'],         ['note-015','loc-swordcoast']
] AS ref
MATCH (n:Note{id:ref[0]}),(t {id:ref[1]})
MERGE (n)-[:MENTIONS]->(t);