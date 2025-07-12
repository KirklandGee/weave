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
CREATE CONSTRAINT user_id IF NOT EXISTS     
  FOR (u:User)       REQUIRE u.id IS UNIQUE;
CREATE CONSTRAINT campaign_id IF NOT EXISTS 
  FOR (c:Campaign) REQUIRE c.id IS UNIQUE;

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

CREATE INDEX node_owner_idx     IF NOT EXISTS FOR (n:Campaign) ON (n.ownerId);
CREATE INDEX node_owner_idx     IF NOT EXISTS FOR (n:Session) ON (n.ownerId);
CREATE INDEX node_owner_idx     IF NOT EXISTS FOR (n:NPC) ON (n.ownerId);
CREATE INDEX node_owner_idx     IF NOT EXISTS FOR (n:Character) ON (n.ownerId);
CREATE INDEX node_owner_idx     IF NOT EXISTS FOR (n:Location) ON (n.ownerId);
CREATE INDEX node_owner_idx     IF NOT EXISTS FOR (n:Note) ON (n.ownerId);

// ── 3.  Full-text index (NEW 5.x syntax) ────────────────────────────────────
CREATE FULLTEXT INDEX fulltext_markdown IF NOT EXISTS
FOR (n:Campaign|Session|NPC|Character|Location|Note)
ON EACH [n.title, n.markdown];

// Add Vector Index for all relevant labels
CREATE VECTOR INDEX campaign_embedding_vec_idx IF NOT EXISTS
FOR (n:Campaign)
ON n.embedding
OPTIONS { 
 indexConfig: {
   `vector.dimensions`: 384,
   `vector.similarity_function`: 'cosine'
 }
};

CREATE VECTOR INDEX session_embedding_vec_idx IF NOT EXISTS
FOR (n:Session)
ON n.embedding
OPTIONS { 
 indexConfig: {
   `vector.dimensions`: 384,
   `vector.similarity_function`: 'cosine'
 }
};

CREATE VECTOR INDEX npc_embedding_vec_idx IF NOT EXISTS
FOR (n:NPC)
ON n.embedding
OPTIONS { 
 indexConfig: {
   `vector.dimensions`: 384,
   `vector.similarity_function`: 'cosine'
 }
};

CREATE VECTOR INDEX character_embedding_vec_idx IF NOT EXISTS
FOR (n:Character)
ON n.embedding
OPTIONS { 
 indexConfig: {
   `vector.dimensions`: 384,
   `vector.similarity_function`: 'cosine'
 }
};

CREATE VECTOR INDEX location_embedding_vec_idx IF NOT EXISTS
FOR (n:Location)
ON n.embedding
OPTIONS { 
 indexConfig: {
   `vector.dimensions`: 384,
   `vector.similarity_function`: 'cosine'
 }
};

CREATE VECTOR INDEX note_embedding_vec_idx IF NOT EXISTS
FOR (n:Note)
ON n.embedding
OPTIONS { 
 indexConfig: {
   `vector.dimensions`: 384,
   `vector.similarity_function`: 'cosine'
 }
};

// Indexes for embedding management
CREATE INDEX embedding_updated_idx     IF NOT EXISTS FOR (n:Campaign) ON (n.embeddedAt);
CREATE INDEX embedding_updated_idx     IF NOT EXISTS FOR (n:Session) ON (n.embeddedAt);
CREATE INDEX embedding_updated_idx     IF NOT EXISTS FOR (n:NPC) ON (n.embeddedAt);
CREATE INDEX embedding_updated_idx     IF NOT EXISTS FOR (n:Character) ON (n.embeddedAt);
CREATE INDEX embedding_updated_idx     IF NOT EXISTS FOR (n:Location) ON (n.embeddedAt);
CREATE INDEX embedding_updated_idx     IF NOT EXISTS FOR (n:Note) ON (n.embeddedAt);