## RESOURCES

### Walkthrough Videos:
- Part 1: https://www.loom.com/share/6967d18257934535b24f033c60861014
- Part 2: https://www.loom.com/share/dbf454b856174b08a2d4097c321430fb

## Top Priority
- [ ] Build basic agent framework for creating notes, updating notes, adding and removing relationships, etc.
  - This can all just work in Dexie, no need to work directly with Neo4J. We can just use structured inputs/outputs for this and Langchain for prompt templating and tools
- [ ] Integrate Stripe for payments with Clerk
  - [ ] Gate LLM access behind payments
  - [ ] Add some kind of payment tracking to the user nodes in some way
- [ ] Build prompt injection detection


## BUGS
- [ ] For markdown imports, handle Obsidian internal links. So if it is [[word]] without any link after, just remove that. And a bunch of other formatting stuff

## TODO

For now, I started building out some models and endpoints for basic CRUD of these pieces of data. I need to 

### BACKEND

- [ ] Split out ChatService, EmbeddingService, CostService interfaces for modularity  
- [ ] Fix template creation to use some kind of schema for the title instead of extracting from the note. 

**LLMS**
- [ ] Build endpoint to summarize the contents of a given note, including it's relationships (if relevant). 
  - Will be a pretty basic endpoint, but needs a solid prompt chain/template behing the scenes
- [ ] For all calls, get actual relationships, but if none are found, get the top 3 most-similar notes. 
  - Need to prompt this in particular to say there's no direct relationship, but it could be relevant

**Prompt Templates**
- [ ] Create a new NPC based on all Lore documents in your workspace
- [ ] Generate a new location (Realm, Region, Town, etc.) based on the existing locations, and some general instructions
- [ ] Generate a special item uniquely for a character or a location (based on a note and it's relationships)
- [ ] Generate session ideas based on all previous sessions and what could potentially come next (Think about all characters in the campaign, all sessions, )

**API**
- [ ] Build a `/summarize` endpoint to auto-compress old chat history
- [ ] Add simple concurrency metrics (thread-pool utilization) and tune thread-pool size  

### Frontend
- [ ] Add “summarize history” trigger to collapse older messages into a summary 
- [ ] Cache the related suggestions in Redis, probably? TTL of a day, I think. Check that first, THEN run the embeddings check. And also show a small loading skeleton/indicator, and "none found" if it doesn't find any. 
- [ ] Add the ability to make folders/organize your notes however you want, with some default folders for "Characters" "Locations" and "Lore" or something
- [ ] Rethink note and relationship types—do we need to change those? 

### Infrastructure & Observability
- [ ] Add request-scoped logging middleware (timings, errors, token counts)  
- [ ] Configure thread-pool/workers in Uvicorn to handle ~20 simultaneous streams  
- [ ] Validate environment variables for quotas & Langfuse (or disable if unused)  

### UI
- [ ] Campaign-based knowledge graph visualzation, same as neo4j browser basically
- [ ] LIne 33 /lib/db/sync.ts Implement something like what's at the bottom to use the max time on the server for pulling to verify time for data so things don't get overwritten.

### Marketing Site
- [ ] Add simplified version of app that users can demo to see how adding relationships works, how the markdown editor feels.
- [ ] Make this simpler

### DONE
- [x] Authentication
- [x] Build proper Langchain prompt templating. 
- [x] Track per-user token usage and enforce quota (billing/cost control) 
- [x] Create basic frontend to talk with AI and show responses for testing
- [x] Implement TipTap markdown editor on frontend
- [x] Create note creation flow. Button currently is just a loading screen
- [x] Show relationships in UI with sttributes, linking to those notes
  - [x] This is close—just need to actually fill the Dexie DB with edge in @sync.ts
- [x] Create types/interfaces for the API and for the frontend to consume
- [x] Stream the response through a HTTP streaming
- [x] Build LLM interface for various models (start local with Ollama for testing, then OpenAI)
- [x] Wire up streaming chat component with partial-chunk rendering and spinner  
- [x] Build basic chat interface for LLM that calls my "chat" endpoint with streaming
- [x] Delete node doesn't work. Deletes from the UI, and then comes back on sync
- [x] Create common endpoints for getting a node + all of it's edges for when the AI calls
- [x] Search notes by title
- [x] Support paste from markdown
- [x] Surface a clear “waiting” state (spinner/fallback) before streaming begins  
- [x] Create embeddings generator, embed all seed entries
- [x] Create endpoints for creating relationships between nodes when someone adds a link. I will make the user choose the relationship when they link? Or just 
- [x] Better note creation flow, including type creation, suggested relationships
- [x] Integrate vector store (Neo4j + vector plugin) and embedding pipeline on note-save  infer based on which node is linking to what. Create some sort of mapping system for this behind the scenes.
- [x] Create suggested relationships based on vector search of Markdown
- [x] Improve relationship recommendations and search based on embeddings
- [x] Organize sidebar by note type
- [x] Expose a `/retrieve` helper that returns top-K similar notes for RAG 
- [x] Support importing a Markdown file via upload
~~- [ ] Explore how an AI can write the Cypher queries, based on my schema, if needed~~
- [x] Explore task queue