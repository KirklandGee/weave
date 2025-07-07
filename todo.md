## Work Session 7/6/25
- Planned out the basics of the app, tested Neo4J with seed data and a few basic queries
- Setup initial FastAPI endpoint for cURL testing of just getting all the nodes

## TODO
- [ ] Create endpoints for common graph traversals
- [ ] Define Cypher schema for DB for LLMs
  - [ ] Explore how an AI can write the Cypher queries, based on my schema
- [ ] Implement AI RAG pipeline to traverse the graph based on some parameters and send additional context to an LLM, parsing out the relevant context
- [ ] Create basic frontend to talk with AI and show responses for testing
- [ ] Implement TipTap markdown editor on frontend
- [ ] Campaign-based knowledge graph visualzation, same as neo4j browser basically
- [ ] Create embeddings generator, embed all seed entries
- [ ] Create types/interfaces for the API and for the frontend to consume
- [ ] Explore task queue
- [ ] Authentication