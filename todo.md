## Work Session 7/6/25
- Planned out the basics of the app, tested Neo4J with seed data and a few basic queries
- Setup initial FastAPI endpoint for cURL testing of just getting all the nodes

## BUGS
- Every time, even with debounce, that the db saves, it moves the cursor around and deletes any whitespace/incomplete nodes. We'll need to eventually switch to storing the JSON in Dexie, and then translating to markdown on the backend—or maybe even just finding a way to store it all in Neo4j, or store that somewhere ELSE and then reference it in the graph—not sure yet.

- [ ] Delete node doesn't work. Deletes from the UI, and then comes back on sync

## TODO

For now, I started building out some models and endpoints for basic CRUD of these pieces of data. I need to 

### BACKEND

- [ ] Integrate vector store (Neo4j + vector plugin) and embedding pipeline on note-save  
- [ ] Split out ChatService, EmbeddingService, CostService interfaces for modularity  

**LLMS**
- [ ] Create common endpoints for getting a node + all of it's edges for when the AI calls
- [ ] Explore how an AI can write the Cypher queries, based on my schema, if needed
- [ ] Define Cypher schema for DB for LLMs
- [ ] Create embeddings generator, embed all seed entries
- [ ] Create suggested relationships based on vector search of Markdown
- [ ] Track per-user token usage and enforce quota (billing/cost control) 

**API**
- [ ] Build a `/summarize` endpoint to auto-compress old chat history
- [ ] Add simple concurrency metrics (thread-pool utilization) and tune thread-pool size  
- [ ] Expose a `/retrieve` helper that returns top-K similar notes for RAG 
- [ ] Create endpoints for creating relationships between nodes when someone adds a link. I will make the user choose the relationship when they link? Or just infer based on which node is linking to what. Create some sort of mapping system for this behind the scenes.
- [ ] Explore task queue
- [ ] Authentication
- [ ] Dedupe relationships in DB

### Frontend
- [ ] Wire up streaming chat component with partial-chunk rendering and spinner  
- [ ] Add “summarize history” trigger to collapse older messages into a summary  
- [ ] Visualize the campaign graph (embed Neo4j browser or custom D3 view)  
- [ ] Implement sidebar search (by title & markdown content)  
- [ ] Organize notes in sidebar by type and support filtering  
- [ ] Improve note-creation flow: select note type & suggest relationships  

### Infrastructure & Observability
- [ ] Add request-scoped logging middleware (timings, errors, token counts)  
- [ ] Configure thread-pool/workers in Uvicorn to handle ~20 simultaneous streams  
- [ ] Validate environment variables for quotas & Langfuse (or disable if unused)  

### UI
- [ ] Build basic chat interface for LLM that calls my "chat" endpoint with streaming
- [ ] Campaign-based knowledge graph visualzation, same as neo4j browser basically
- [ ] Search notes by title, then markdown. Elastic?
- [ ] Organize sidebar by note type
- [ ] Better note creation flow, including type creation, suggested relationships
- [ ] Surface a clear “waiting” state (spinner/fallback) before streaming begins  

- [ ] LIne 33 /lib/db/sync.ts Implement something like what's at the bottom to use the max time on the server for pulling to verify time for data so things don't get overwritten.


### DONE
- [x] Create basic frontend to talk with AI and show responses for testing
- [x] Implement TipTap markdown editor on frontend
- [x] Create note creation flow. Button currently is just a loading screen
- [x] Show relationships in UI with sttributes, linking to those notes
  - [x] This is close—just need to actually fill the Dexie DB with edge in @sync.ts
- [x] Create types/interfaces for the API and for the frontend to consume
- [x] Stream the response through a HTTP streaming
- [x] Build LLM interface for various models (start local with Ollama for testing, then OpenAI)