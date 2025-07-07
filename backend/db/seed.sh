#!/usr/bin/env zsh
# seed.sh ― run every seed file against the local Neo4j instance

set -euo pipefail

# ---------------------------------------------------------------------------
# Config -- tweak here if you ever change creds or port
NEO4J_USER=${NEO4J_USER:-neo4j}
NEO4J_PASS=${NEO4J_PASS:-secretgraph}
NEO4J_BOLT=${NEO4J_BOLT:-bolt://localhost:7687}

FILES=(
  seed_data/constraints.cql
  seed_data/campaigns.cql
  seed_data/locations.cql
  seed_data/maps.cql
  seed_data/characters.cql
  seed_data/npcs.cql
  seed_data/sessions.cql
  seed_data/notes.cql
  seed_data/relationships.cql
)
# ---------------------------------------------------------------------------

# sanity check
for f in $FILES; do
  [[ -r $f ]] || { echo "❌  Missing file: $f"; exit 1 }
done

echo "▶️  Seeding Neo4j at $NEO4J_BOLT …"
for f in $FILES; do
  echo "   • $f"
  # cat → stdin keeps cypher-shell quiet about prompts
  cat "$f" | cypher-shell -a "$NEO4J_BOLT" -u "$NEO4J_USER" -p "$NEO4J_PASS"
done

echo "✅  All seed files executed successfully."