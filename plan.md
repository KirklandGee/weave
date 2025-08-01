# AI-Powered D&D Campaign Manager – System Plan

## Overview

This project is a web-based campaign management tool for D&D (or similar TTRPGs), designed with an Obsidian-like UX. It supports markdown-based document management, knowledge graph linking, document embeddings, and AI-augmented gameplay features for DMs. The long-term vision includes adding a full autonomous DM agent, but the short-term focus is on context-aware augmentation for human DMs.


---

## Core Features

- Markdown-based documents with [[wikilinks]]
- Graph visualization of entities and their relationships
- AI-assisted context retrieval (RAG) for sessions, NPCs, and locations
- Semantic embeddings and similarity-based recommendations
- Entity typing and structured metadata (e.g., NPC vs Session)
- Session-aware LLM assistant with context fetching
- Future: autonomous agent for simulation/decision-making

---

## Frontend Stack

- **Framework**: Next.js
- **Editor**: Tiptap (customizable ProseMirror-based rich markdown editor)
- **Styling**: TailwindCSS
- **Graph Visualization**: `cytoscape.js` or `vis.js`
- **Authentication**: Clerk or Auth.js
- **Markdown Parsing**: `markdown-it` or custom parser to extract wikilinks and frontmatter

---

## Backend Stack

- **Language**: Python
- **Framework**: FastAPI
- **API Layer**: REST (GraphQL optional, not used initially)
- **Graph DB**: Neo4j (via Bolt protocol)
- **Vector DB (optional)**: Qdrant or use Neo4j properties for embedding storage
- **Task Queue**: Celery + Redis
- **Embedding Models**: OpenAI, Instructor, or SentenceTransformers
- **LLM Integration**: Langchain, LlamaIndex, or custom RAG pipeline

---

## Data Model (Neo4j Schema)

### Node Labels
- `:Campaign`
- `:Session`
- `:NPC`
- `:Character`
- `:Location`
- `:Note` (general-purpose markdown document)

### Common Node Properties
- `id: string` (UUID or slug)
- `title: string`
- `markdown: string` (raw content)
- `type: string` (redundant label fallback: "NPC", "Location", etc.)
- `tags: [string]`
- `embedding: [float]` (optional, stored vector)
- `createdAt`, `updatedAt`

### Relationships
- `(:Session)-[:INVOLVES]->(:NPC)`
- `(:Session)-[:OCCURS_IN]->(:Location)`
- `(:NPC)-[:VISITED]->(:Location)`
- `(:NPC)-[:KNOWS]->(:NPC)`
- `(:Character)-[:KNOWS]->(:NPC)`
- `(:Note)-[:MENTIONS]->(:NPC|:Location|:Session)`
- `(:Session)-[:FOLLOWS]->(:Session)`

---

## Application Structure

### Frontend

```
/frontend
/components
  Editor.tsx
  GraphView.tsx
  EntitySidebar.tsx
  ChatPanel.tsx
/pages
/docs/[id].tsx
/sessions/[id].tsx
/api/*
/lib
  wikilinkParser.ts
  embeddingClient.- 
```

### Backend

```
/backend
/app
/routes
/api
  create_document.py
  get_context.py
  query_graph.py
/services
  neo4j_service.py
  embedding_service.py
  rag_service.py
/tasks
  generate_embedding.py
  auto_link_nodes.py
/graph
  schema.md         # Documented schema & constraints
  seed.cypher       # Initial campaign structure
```

---

## AI Context Pipeline (RAG)

1. User views a session or types a prompt.
2. Backend identifies current node(s) (e.g., `Session 12`).
3. Traverse graph (1–2 hops) to collect relevant nodes.
4. Fetch embeddings of related notes/NPCs/locations.
5. Rank top-K relevant chunks using cosine similarity.
6. Construct a prompt context blob.
7. Call LLM (OpenAI, Claude, etc.) with system + context.
8. Return augmented result or suggestion.

---

## Schema Management

- Use Cypher constraints to enforce property presence and unique IDs
- Store schema model in markdown (`schema.md`) for reference
- Maintain sync between frontend editor types and backend Neo4j label/types

---

## Development Priorities

- Markdown editing & wiki-style linking
- Neo4j relationship modeling + embedding integration
- AI-assisted retrieval for sessions (manual + auto)
- Frontend graph viewer and DM-assist chat interface

---
