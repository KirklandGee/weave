# Details

Date : 2025-07-08 21:25:22

Directory /Users/kirklandgee/repos/ai_rpg_manager

Total : 61 files,  11689 codes, 160 comments, 393 blanks, all 12242 lines

[Summary](results.md) / Details / [Diff Summary](diff.md) / [Diff Details](diff-details.md)

## Files
| filename | language | code | comment | blank | total |
| :--- | :--- | ---: | ---: | ---: | ---: |
| [backend/README.md](/backend/README.md) | Markdown | 0 | 0 | 1 | 1 |
| [backend/\_\_init\_\_.py](/backend/__init__.py) | Python | 0 | 0 | 1 | 1 |
| [backend/api/\_\_init\_\_.py](/backend/api/__init__.py) | Python | 0 | 0 | 1 | 1 |
| [backend/api/index.py](/backend/api/index.py) | Python | 9 | 0 | 3 | 12 |
| [backend/api/routers/\_\_init\_\_.pyt](/backend/api/routers/__init__.pyt) | Python | 0 | 0 | 1 | 1 |
| [backend/api/routers/campaigns.py](/backend/api/routers/campaigns.py) | Python | 38 | 0 | 14 | 52 |
| [backend/api/routers/notes.py](/backend/api/routers/notes.py) | Python | 61 | 0 | 21 | 82 |
| [backend/api/routers/sync.py](/backend/api/routers/sync.py) | Python | 166 | 7 | 19 | 192 |
| [backend/db/seed.sh](/backend/db/seed.sh) | Shell Script | 24 | 7 | 6 | 37 |
| [backend/db/seed\_data/campaigns.cql](/backend/db/seed_data/campaigns.cql) | Cypher | 22 | 0 | 1 | 23 |
| [backend/db/seed\_data/characters.cql](/backend/db/seed_data/characters.cql) | Cypher | 6 | 2 | 2 | 10 |
| [backend/db/seed\_data/constraints.cql](/backend/db/seed_data/constraints.cql) | Cypher | 41 | 7 | 6 | 54 |
| [backend/db/seed\_data/locations.cql](/backend/db/seed_data/locations.cql) | Cypher | 18 | 4 | 3 | 25 |
| [backend/db/seed\_data/maps.cql](/backend/db/seed_data/maps.cql) | Cypher | 12 | 3 | 2 | 17 |
| [backend/db/seed\_data/notes.cql](/backend/db/seed_data/notes.cql) | Cypher | 56 | 2 | 15 | 73 |
| [backend/db/seed\_data/npcs.cql](/backend/db/seed_data/npcs.cql) | Cypher | 52 | 9 | 5 | 66 |
| [backend/db/seed\_data/relationships.cql](/backend/db/seed_data/relationships.cql) | Cypher | 152 | 33 | 22 | 207 |
| [backend/db/seed\_data/seed.cql](/backend/db/seed_data/seed.cql) | Cypher | 85 | 13 | 11 | 109 |
| [backend/db/seed\_data/sessions.cql](/backend/db/seed_data/sessions.cql) | Cypher | 10 | 3 | 2 | 15 |
| [backend/main.py](/backend/main.py) | Python | 18 | 0 | 7 | 25 |
| [backend/models/campaigns.py](/backend/models/campaigns.py) | Python | 13 | 0 | 3 | 16 |
| [backend/models/characters.py](/backend/models/characters.py) | Python | 17 | 0 | 4 | 21 |
| [backend/models/components.py](/backend/models/components.py) | Python | 49 | 1 | 11 | 61 |
| [backend/models/notes.py](/backend/models/notes.py) | Python | 6 | 0 | 4 | 10 |
| [backend/pyproject.toml](/backend/pyproject.toml) | toml | 12 | 0 | 1 | 13 |
| [backend/services/\_\_init\_\_.py](/backend/services/__init__.py) | Python | 0 | 1 | 0 | 1 |
| [backend/services/neo4j/\_\_init\_\_.py](/backend/services/neo4j/__init__.py) | Python | 35 | 0 | 8 | 43 |
| [backend/services/neo4j/queries.py](/backend/services/neo4j/queries.py) | Python | 24 | 1 | 3 | 28 |
| [backend/uv.lock](/backend/uv.lock) | toml | 488 | 0 | 38 | 526 |
| [frontend/README.md](/frontend/README.md) | Markdown | 23 | 0 | 14 | 37 |
| [frontend/eslint.config.mjs](/frontend/eslint.config.mjs) | JavaScript | 12 | 0 | 5 | 17 |
| [frontend/next.config.ts](/frontend/next.config.ts) | TypeScript | 13 | 1 | 3 | 17 |
| [frontend/package-lock.json](/frontend/package-lock.json) | JSON | 9,185 | 0 | 1 | 9,186 |
| [frontend/package.json](/frontend/package.json) | JSON | 46 | 0 | 1 | 47 |
| [frontend/postcss.config.js](/frontend/postcss.config.js) | JavaScript | 6 | 0 | 1 | 7 |
| [frontend/public/file.svg](/frontend/public/file.svg) | XML | 1 | 0 | 0 | 1 |
| [frontend/public/globe.svg](/frontend/public/globe.svg) | XML | 1 | 0 | 0 | 1 |
| [frontend/public/next.svg](/frontend/public/next.svg) | XML | 1 | 0 | 0 | 1 |
| [frontend/public/vercel.svg](/frontend/public/vercel.svg) | XML | 1 | 0 | 0 | 1 |
| [frontend/public/window.svg](/frontend/public/window.svg) | XML | 1 | 0 | 0 | 1 |
| [frontend/src/app/globals.css](/frontend/src/app/globals.css) | CSS | 3 | 0 | 0 | 3 |
| [frontend/src/app/layout.tsx](/frontend/src/app/layout.tsx) | TypeScript JSX | 30 | 0 | 5 | 35 |
| [frontend/src/app/page.tsx](/frontend/src/app/page.tsx) | TypeScript JSX | 91 | 6 | 17 | 114 |
| [frontend/src/components/Inspector.tsx](/frontend/src/components/Inspector.tsx) | TypeScript JSX | 18 | 1 | 2 | 21 |
| [frontend/src/components/Nav.tsx](/frontend/src/components/Nav.tsx) | TypeScript JSX | 63 | 4 | 9 | 76 |
| [frontend/src/components/Sidebar.tsx](/frontend/src/components/Sidebar.tsx) | TypeScript JSX | 152 | 12 | 11 | 175 |
| [frontend/src/components/Tiptap.tsx](/frontend/src/components/Tiptap.tsx) | TypeScript JSX | 107 | 4 | 10 | 121 |
| [frontend/src/lib/constants.ts](/frontend/src/lib/constants.ts) | TypeScript | 3 | 1 | 0 | 4 |
| [frontend/src/lib/db/campaignDB.ts](/frontend/src/lib/db/campaignDB.ts) | TypeScript | 22 | 0 | 4 | 26 |
| [frontend/src/lib/db/sync.ts](/frontend/src/lib/db/sync.ts) | TypeScript | 34 | 31 | 8 | 73 |
| [frontend/src/lib/hooks/useActiveNode.ts](/frontend/src/lib/hooks/useActiveNode.ts) | TypeScript | 45 | 2 | 10 | 57 |
| [frontend/src/lib/hooks/useCampaignNodes.ts](/frontend/src/lib/hooks/useCampaignNodes.ts) | TypeScript | 35 | 2 | 5 | 42 |
| [frontend/src/lib/hooks/useEdgeOps.ts](/frontend/src/lib/hooks/useEdgeOps.ts) | TypeScript | 69 | 1 | 11 | 81 |
| [frontend/src/lib/hooks/useNodeOps.ts](/frontend/src/lib/hooks/useNodeOps.ts) | TypeScript | 74 | 1 | 11 | 86 |
| [frontend/src/lib/md.ts](/frontend/src/lib/md.ts) | TypeScript | 28 | 0 | 4 | 32 |
| [frontend/src/types/node.ts](/frontend/src/types/node.ts) | TypeScript | 30 | 0 | 4 | 34 |
| [frontend/tailwind.config.js](/frontend/tailwind.config.js) | JavaScript | 8 | 1 | 2 | 11 |
| [frontend/tsconfig.json](/frontend/tsconfig.json) | JSON with Comments | 27 | 0 | 1 | 28 |
| [plan.md](/plan.md) | Markdown | 115 | 0 | 33 | 148 |
| [pyrightconfig.json](/pyrightconfig.json) | JSON | 5 | 0 | 0 | 5 |
| [todo.md](/todo.md) | Markdown | 26 | 0 | 6 | 32 |

[Summary](results.md) / Details / [Diff Summary](diff.md) / [Diff Details](diff-details.md)