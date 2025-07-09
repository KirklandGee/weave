## Work Session 7/6/25
- Planned out the basics of the app, tested Neo4J with seed data and a few basic queries
- Setup initial FastAPI endpoint for cURL testing of just getting all the nodes

## BUGS
- Every time, even with debounce, that the db saves, it moves the cursor around and deletes any whitespace/incomplete nodes. We'll need to eventually switch to storing the JSON in Dexie, and then translating to markdown on the backend—or maybe even just finding a way to store it all in Neo4j, or store that somewhere ELSE and then reference it in the graph—not sure yet.

## TODO

For now, I started building out some models and endpoints for basic CRUD of these pieces of data. I need to 

- [x] Create note creation flow. Button currently is just a loading screen
- [ ] Search notes ny title, then markdown. Elastic?
- [ ] Show relationships in UI with sttributes, linking to those notes
  - [ ] This is close—just need to actually fill the Dexie DB with edge in @sync.ts
- [ ] Create endpoints for common graph traversals
- [ ] Create endpoints for creating relationships between nodes when someone adds a link. I will make the user choose the relationship when they link? Or just infer based on which node is linking to what. Create some sort of mapping system for this behind the scenes.
  THIS IS IN PROGRESS ^
- [ ] Define Cypher schema for DB for LLMs
  THIS IS IN PROGRESS ^ 
- [x] Create types/interfaces for the API and for the frontend to consume
  THIS IS IN PROGRESS
  - [ ] Explore how an AI can write the Cypher queries, based on my schema
- [ ] Implement AI RAG pipeline to traverse the graph based on some parameters and send additional context to an LLM, parsing out the relevant context
- [x] Create basic frontend to talk with AI and show responses for testing
- [x] Implement TipTap markdown editor on frontend
- [ ] Campaign-based knowledge graph visualzation, same as neo4j browser basically
- [ ] Create embeddings generator, embed all seed entries

- [ ] Explore task queue
- [ ] Authentication
- [ ] LIne 33 /lib/db/sync.ts Implement something like what's at the bottom to use the max time on the server for pulling to verify time for data so things don't get overwritten.
