// ─────────────────────────────────────────────────────────────────────────────
// NPCs for Campaign 1: “Faerûn in Crisis”
// id pattern: npc-<shortname>
// ─────────────────────────────────────────────────────────────────────────────
UNWIND [
  {id:'npc-ivar',       title:'Ivar the Grey',            role:'Reclusive Wizard'},
  {id:'npc-sera',       title:'Seraphine du Vall',        role:'Cormyrian Courtier'},
  {id:'npc-bork',       title:'Bork the Black',           role:'Bandit Captain'},
  {id:'npc-keld',       title:'Keld Stonevein',           role:'Dwarven Archivist'},
  {id:'npc-lira',       title:'Lira Dawnsong',            role:'Elf Harper Spy'},
  {id:'npc-haggra',     title:'Haggra Hexeye',            role:'Night Hag Broker'},
  {id:'npc-garrik',     title:'Garrik One-Arm',           role:'Purple Dragon Veteran'},
  {id:'npc-zenya',      title:'Zenya Bloodquill',         role:'Necromancer Acolyte'},
  {id:'npc-thom',       title:'Thom Buckleberry',         role:'Halfling Gossip-monger'},
  {id:'npc-vyktor',     title:'Vyktor Vald',              role:'Tiefling Smuggler'}
] AS npc
CREATE (:NPC {
  id:       npc.id,
  title:    npc.title,
  type:     'NPC',
  markdown: '
### ' + npc.title + '
' + npc.role + '

**Background**  
Lorem ipsum dolor sit amet, adventuring tales and dark secrets that tie into the looming crisis.

**Motivation**  
Preserve personal power while steering events to their advantage.',
  createdAt: datetime(),
  updatedAt: datetime()
});

// ─────────────────────────────────────────────────────────────────────────────
// NPCs for Campaign 2: “Storm Lords of the Sword Coast”
// id pattern: npc-sc-<shortname> to avoid collisions, but relationships.cql
// already uses npc-volo etc., so keep same root scheme for clarity.
// ─────────────────────────────────────────────────────────────────────────────
UNWIND [
  {id:'npc-volo',       title:'Volothamp Geddarm',        role:'Travel Chronicler'},
  {id:'npc-reya',       title:'Reya Mantlemorn',          role:'Hellrider of Elturel'},
  {id:'npc-krieg',      title:'Captain Krieg',            role:'Mercenary Sellsword'},
  {id:'npc-marish',     title:'Marish Coldwater',         role:'Waterdeep Harbourmaster'},
  {id:'npc-selene',     title:'Selene Shadowstep',        role:'Half-drow Fence'},
  {id:'npc-orryk',      title:'Orryk Wobblegear',         role:'Gnome Artificer'},
  {id:'npc-cruach',     title:'Cruach of the Deep',       role:'Sea-spawn Oracle'},
  {id:'npc-loralei',    title:'Loralei Stormsinger',      role:'Sahuagin Envoy'},
  {id:'npc-bartleby',   title:'Bartleby Grizz',           role:'Dwarven Innkeeper'},
  {id:'npc-viessa',     title:'Viessa Thunderhand',       role:'Tempest Cleric'}
] AS npc
CREATE (:NPC {
  id:       npc.id,
  title:    npc.title,
  type:     'NPC',
  markdown: '
### ' + npc.title + '
' + npc.role + '

**Background**  
Rumors swirl along the Sword Coast about their deeds—some heroic, others dubious.

**Motivation**  
Entangled in the brewing storms, each seeks leverage amid rising chaos.',
  createdAt: datetime(),
  updatedAt: datetime()
});