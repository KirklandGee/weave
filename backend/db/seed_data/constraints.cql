// ── 1.  Uniqueness constraints ──────────────────────────────────────────────
CREATE CONSTRAINT IF NOT EXISTS
  FOR (n:Campaign)  REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS
  FOR (n:Session)   REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS
  FOR (n:NPC)       REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS
  FOR (n:Character) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS
  FOR (n:Location)  REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS
  FOR (n:Note)      REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS
  FOR (n:Map)       REQUIRE n.id IS UNIQUE;

// ── 2.  Property indexes ────────────────────────────────────────────────────
CREATE INDEX note_tags_idx      IF NOT EXISTS FOR (n:Note)      ON (n.tags);
CREATE INDEX loc_type_idx       IF NOT EXISTS FOR (n:Location)  ON (n.type);

/* title & markdown:
   Neo4j 5 does NOT allow “all labels” property indexes.
   Create them only for the labels you query frequently.
*/
CREATE INDEX title_campaign_idx IF NOT EXISTS FOR (n:Campaign)  ON (n.title);
CREATE INDEX title_session_idx  IF NOT EXISTS FOR (n:Session)   ON (n.title);
CREATE INDEX title_npc_idx      IF NOT EXISTS FOR (n:NPC)       ON (n.title);
CREATE INDEX title_char_idx     IF NOT EXISTS FOR (n:Character) ON (n.title);
CREATE INDEX title_loc_idx      IF NOT EXISTS FOR (n:Location)  ON (n.title);
CREATE INDEX title_note_idx     IF NOT EXISTS FOR (n:Note)      ON (n.title);

CREATE INDEX md_campaign_idx    IF NOT EXISTS FOR (n:Campaign)  ON (n.markdown);
CREATE INDEX md_session_idx     IF NOT EXISTS FOR (n:Session)   ON (n.markdown);
CREATE INDEX md_npc_idx         IF NOT EXISTS FOR (n:NPC)       ON (n.markdown);
CREATE INDEX md_char_idx        IF NOT EXISTS FOR (n:Character) ON (n.markdown);
CREATE INDEX md_loc_idx         IF NOT EXISTS FOR (n:Location)  ON (n.markdown);
CREATE INDEX md_note_idx        IF NOT EXISTS FOR (n:Note)      ON (n.markdown);

// ── 3.  Full-text index (NEW 5.x syntax) ────────────────────────────────────
CREATE FULLTEXT INDEX fulltext_markdown IF NOT EXISTS
FOR (n:Campaign|Session|NPC|Character|Location|Note)
ON EACH [n.title, n.markdown];