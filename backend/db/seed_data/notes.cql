UNWIND [
  // ── Faerûn-in-Crisis campaign notes ───────────────────────────────────────
  {id:'note-001', title:'Wyvern’s Rest Rumors',
   tags:['rumors','npcs'],
   markdown:'- **Shadow-cloaked riders** spotted on the Cormyrian road.\n- Bork the Black seen buying grave-dirt behind the stables.'},

  {id:'note-002', title:'Crypt Puzzle Key',
   tags:['puzzles','lore'],
   markdown:'Three levers—**Sun**, **Moon**, **Blood**.\nPull them in *moon → sun → blood* order to open the hidden vault.'},

  {id:'note-003', title:'Princess Raedra’s Offer',
   tags:['quests','politics'],
   markdown:'Aid for Suzail if proof emerges that necromancers are subverting the Purple Dragon guard.'},

  {id:'note-004', title:'Cormyr War-Chest Inventory',
   tags:['items'],
   markdown:'Ledgers list 4 000 gp in griffon-stamped bars and a sealed chest labeled **“For Storm Lord Contingency.”**'},

  {id:'note-005', title:'Garrik’s Confession',
   tags:['relationships'],
   markdown:'Garrik One-Arm admits he once served under Bork and still owes him “a blood-debt.”'},

  {id:'note-006', title:'Haggra’s Bargain',
   tags:['npc','lore'],
   markdown:'Night hag Haggra Hexeye will trade shadow-silk garments for a **“soul touched by moonlight.”** Elira qualifies.'},

  {id:'note-007', title:'Shadowfell Leakage Report',
   tags:['danger','lore'],
   markdown:'Thin barrier detected near the **Haunted Crypts of Shadowfell**.  Necrotic seepage increasing nightly.'},

  // ── Storm-Lords campaign notes ────────────────────────────────────────────
  {id:'note-008', title:'Storm Sigil Fragment',
   tags:['items','mystery'],
   markdown:'Silver medallion crackles near saltwater.  Missing twin half rumored in Neverwinter Wood.'},

  {id:'note-009', title:'Fey Crossing Riddle',
   tags:['puzzles','magic'],
   markdown:'“When the third raven laughs, speak the name **Shiallia** to walk between the trees.”'},

  {id:'note-010', title:'Triboar Trail Ambush Log',
   tags:['battle','rumors'],
   markdown:'Owlbear claw marks found alongside wagon ruts—no corpses, only broken chests of salted fish.'},

  {id:'note-011', title:'Undermountain Level-1 Rumors',
   tags:['dungeon'],
   markdown:'Entry hall guarded by a **gibbering mouther**.  Secret door on east wall opens to spiral stair.'},

  {id:'note-012', title:'Tempest Relic Blueprint',
   tags:['items','tasks'],
   markdown:'Orryk Wobblegear sketched a conductive trident that channels lightning through sapphires.'},

  {id:'note-013', title:'Storm Cult Hierarchy',
   tags:['faction','politics'],
   markdown:'Viessa Thunderhand (cleric) ← reports to → an **unseen “Typhoon Herald.”**  Cruach of the Deep supplies relics.'},

  {id:'note-014', title:'Kairos Shipping Ledger',
   tags:['economic','quest'],
   markdown:'Vyktor Vald smuggled three crates marked “KAI-07” into Waterdeep docks under Volothamp’s charter.'},

  {id:'note-015', title:'Sword Coast Weather Omens',
   tags:['foreshadow','storm'],
   markdown:'Cruach’s shell divinations predict a waterspout large enough to swallow **three galleons** within ten days.'}

] AS n
CREATE (:Note {
  id:        n.id,
  title:     n.title,
  type:      'Note',
  markdown:  n.markdown,
  tags:      n.tags,
  createdAt: datetime(),
  updatedAt: datetime()
});