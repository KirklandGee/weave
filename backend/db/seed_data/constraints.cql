// ── 1. uniqueness ────────────────────────────────────────────────────────────
CREATE CONSTRAINT IF NOT EXISTS
  FOR (n:Campaign)   REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS
  FOR (n:Session)    REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS
  FOR (n:NPC)        REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS
  FOR (n:Character)  REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS
  FOR (n:Location)   REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS
  FOR (n:Note)       REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS
  FOR (n:Map)        REQUIRE n.id IS UNIQUE;

// ── 2. property indexes for fast lookup / search ────────────────────────────
CREATE INDEX IF NOT EXISTS note_tags_idx    FOR (n:Note)      ON (n.tags);
CREATE INDEX IF NOT EXISTS all_title_idx    FOR (n)           ON (n.title);
CREATE INDEX IF NOT EXISTS all_markdown_idx FOR (n)           ON (n.markdown);
CREATE INDEX IF NOT EXISTS loc_type_idx     FOR (n:Location)  ON (n.type);

// (optional) full-text index for later fuzzy search
CALL db.index.fulltext.createNodeIndex(
  'fulltext_markdown', ['Campaign','Session','NPC','Character','Location','Note'], ['markdown','title']
);