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
- [ ] The simple relationship based retrieval is likely not going to be sufficient. I need some semantic/take all the "lore" notes or something at all times, know what location a given session is in, something like that. Maybe I do just have to rely on RAG, but that depends on notes being similar, which they may not always be. I also need to have some core settings by campaign that I can give the AI like system/level for encounters (so probably need a dedicated "player character" note type with some required fields there). Tone of the campaig, etc. If I have that player character note,I need to be able to  
- [ ] Need to add PDF support as files you can store (somehow)
- [ ] The relationships need to be @ mentionable both in the text of a note and also in the AI chat. I already have all the search functionality, so it shouldn't be that hard.
- [ ] A basic to-do/checklist could be good. Not tied to notes, but just a way to keep track of little things you want to do. Need some UI for it.  
- [ ] For any ideas, things the AI comes up with, having the assistant make sure each things comes with a simple "dm reference" could be useful. 

## BUGS
- [ ] For markdown imports, handle Obsidian internal links. So if it is [[word]] without any link after, just remove that. And a bunch of other formatting stuff
- [ ] There's still a lot of small bugs with TipTap and the way we debounce/handle sync. It doesn't quite feel right to use between all the text conversion, saving, etc. Makes it really weird from a UX perspective. Mostly it seems like newlines are where the problems come up most often. I should probably handle the HTML conversion better. Also seem to be mostly related to headings, in most cases.
- [ ] For the AI chat, we should add more context by default, not just direct relationships. We need a way to mark certain documents as "core", to always be considered, and to @mention specific notes or folders when chatting, I think.
- [ ] On import, notes are uncategorized but don't show up in the sidebar until a refresh
- [ ] I've now removed all access to templates in the UI outside of the command pallete, and those don't work. I guess eventually having an agent will remove the need for those in some ways, too. 
- [ ] Should support adding multiple relationships simultaneously
- [ ] On pasting, the sync doesn't really work for some reason. I don't think it registers a change if you don't sit on the note long enough? Probably need to shorten the idle window. Could also be some kind of race condition. Actually, it does look like it just requires some kind of typing to verify that a change has been made. 
- [ ] We HAVE to store the AI chats. We keep all the message logs anyways, so it shouldn't be that hard to keep those in an extra Dexie table and just keep nodes in the graph. I think these will also need to belong to a "campaign" though, so will have to exclude them from other queries. I'm almost tempted to just use a separate postgres table for that, but I'm not sure it's worth it. Probably still easier to just use the graph and make sure those notes aren't embedded, searched, etc. in the same way. Almost makes me think I need to just change my labels to NOTES with some 'type' prop, and then use other labels for other things to make my searching and stuff easier. 
  - [ ] This also means we need to implement the same compacting/summarizing like claude code would use to keep context from getting enormous. 
- [ ] On sending a message, should jump the AI chat down to where that message sent, but not keep going.
- [ ] LLMs are FAR too wordy. Need to add some instructions around brevity and being concise in the system prompts, and in general work on the default one that defines it's personality, etc.
- [ ] There's often a lot of latency on the LLM requests. I don't know if it's OpenAI, Railway, or what, but it's super noticeable. 
- [ ] When highlighting an AI chat message, you are not able to start anywhere but the start of the message
- [ ] There are a lot of words here that are not English. I should basically disable the spell checking in the tiptap editor.
- [ ] Seeing some duplicate sync API calls that can probably be avoided. 
- [ ] New notes still are not getting embedd3ed through the background job. 

]

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