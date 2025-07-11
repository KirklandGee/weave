1. What is the real-time UX promise?
	-	Ideally we have streaming, sub-500ms to start streaming in, with reasonable speed as it goes (model dependent)
  - Primary task is going to be general chatting about the context of the workspace, helping draft sections, create NPCs, etc.—rarely doing "rules adjudication", but we will need some documents/rules to verify details for certain games. 
    - That's more of a long-term play. For now we can trust it'll be good enough. At some point, we can do RAG on some large document like the 5e player's handbook. Just have to figure out **licensing**
  - Will need some kind of spinner UX for startup on chat. Bubbles, a spinner, something. OpenAI has latency and need to account for that. 

2. Task taxonomy & model selection
  - Generating graph DB edges/relationships between notes—probably on save, or maybe from the UI rather than making it automatic. It will look at a given node, compare it to the embeddings of the others, and suggest similar ones. 
  - Should probably also consider some other things outside of vectors here.
  - At the end of a session, should summarize anything in the chat history, ask some follow up questions for anythign where there are gaps, and write a summary for that session to the note. Data storage for all of this can just be in markdown of notes, not some special data properties.
  - Retrieval of information will be another common need/use case.
  - For all of these, I think they'll need at least gpt-4 level to be reliably good. Maybe some could use o4-mini, instead, for like extracting quick facts/retrieval of simple questions, but that might be more complex than it's worth compared to just using gpt-4o for everything.
  - I doubt local models will really work, since this is a web app. 
  - We can set the model in some service, and then route it from there, no need to change the API or the frontend in those cases.
  - Should consider **hosted GGUF models (via something like Fireworks, Together, or GroqCloud)**? You’d retain web compatibility but get fast inference and potentially big cost savings over OpenAI.
  - Implement small routing layer (like a service or LangChain Router) to dynamically switch models based on prompt metadata?



3. Context budget strategy
  - Context budget is interesting. I can imagine if we pull all the relevant nodes (not using any kind of rag) and then also have some chat history, we could easily hit 10-15k words. That would mean something like 20,000-30k tokens on the high end of some calls. I doubt anything would get bigger than that. For now, early on, I would expect <10k words no matter what
  - I imagine I need to keep chat window history stable, but after X tokens, I can probably generate a summary of what's happened so far, show that to the user, and then if they agree, add that to the current session's note and reset the chat history with that as context. Maybe prompt them but only do it on click? Similar to Cursor. But then again, users are likely not that technical, so we want it to fell magic. 
  - We could also just do something clever where we embed the conversation and only RAG on things a certain amount of context back. 
  - SUmmarization will always be done by LLM. Maybe we use a bigger model for summaries—o3 or something—to be able to catch more details.

4. Retrieval (RAG) pipeline
  - Embeddings will based on the "markdown" field
  - We'll need a vector DB. I think neo4j supports this, so we can just embed all of the nodes. We don't nee to "embed" the relationships I don't think? We could do hybrid queries like: “Give me all nodes with a relationship to X or nodes whose embeddings match query Y above threshold Z.” Neo4j + vector + Cypher can support this hybrid fairly cleanly.
  - We can update the embeddings not on every sync, but every time there's a substantial enough change. Maybe X characters changes in a note, we update the embedding just for that note?
  - Merging retrieved chunks will get put into the system prompt of the newest message. We should look into some prompt caching (which i know is a thing, but not how it works) to cache all the system prompt context instead of resending it on every user message.
  - Rarely will we ever just answer from the DB. Almost everything will need to go through an LLM for stuff like this, I think. 

5. DB operations via LLM
  - The more I think about this, the less important I think it is.
  - It almost certainly won't be correct, and with a graph DB, we can always pull nodes or pull things by embeddings. Those can be static queries, just passing in a node to compare with.

6. Orchestration & observability
  - Temporal seems like overkill for this kind of application? We don't need "long running workflows". We need chats, quick embeddings, etc. No individual call should take more than a few seconds to start streaming the response back through HTTP. 
  - We do probably need some kind of orchestration setup/tracing for all of this, so some handler that sends things to LangFuse/langsmith or whatever system we use, every call going through the same Class so we get all of this logging, no matter the type of call. 
  - This also would allow for alerts on costs, errors, etc. 

7. Cost controls
  - I think the budget cap should be per user, per month, since that's the revenue model.
  - I don't know what number is, but if we're tracking it, we can set those controls. I think we have to give them X number of generations vs. X tokens, but maybe we can just do usage based pricing, instead. I need to figure this out.
  - We could, at this point, switch them to a much cheaper/even a "free" model
  - I still don't see where caching comes into play here. How often would a user look at a specific note and ask the EXACT same question multiple times? Seems unlikely. They might ask a variation, whcih would invalidate the caching anyways.

8. Concurrency & scaling
  - In a lot of ways, I expect 0, but I could end up being surprised. I don'd have a solid number for this.
  - Queuing vs. streaming is interesting. I think by default, we stream everything, with some very unique exceptions. Those might be:
    - Updating relationships between nodes (that can just spin and then send back the response)
    - Session summaries (this will go to a bigger model and write back to a given note, so we can just run this as a "job". We can figure out UI later)
    - Maybe a few other things?
  - If the queue does fill, slowing down is better than degrading, I think. 

9. Security & privacy
  - No PII or paid content I think. Eventually we could get licensing for rule books and maybe have to think about that, but all that information is freely available online, so it's probably fine. 
  - For user-uploaded content, the only thing to think about is if THEY upload a PDF of a rulebook—how do I handle that? I guess maybe I could put the onus of ownership on them? I don't want to get into legal trouble there, but if they upload their own rulebooks, then that means we get to do RAG on the rulebooks. 

10. Versioning & experimentation
  - A/B testing new prompt templates—probably only apply to a handful of users? I should set things up in such a way where I can do this. I can probably setup an experiment/versioning version of a given endpoint, and then on the frontend, hit that one if USER_ID is one of a number for testing. 
  - I doubt this will happen much. 

11. Developer ergonomics
  - I hate unit tests. I do need some kind of LLM evals, probably, but that can be sorted out much later.
  - Local dev is just going to mostly use Ollama running locally. I guess at some point I'll have to figure out the endpoint situation for that. Once the app is using OpenAI, I can probably just run that locally too for testing, but in the building phase I won't do that.

12. Future-proofing big bets
  - Eventually, the goal is to have an AI experience that can be your DM/run your campaign. We're a long ways from that now, but eventually that would be the goal. I don't think it would be "multi agent", but maybe it does end up being that. It spins up a new agent, with a new voice, for each NPC? That's actually a really interesting idea. Again though, a little complex.
  - Voice input will definitely happen, maybe even video if the tech supports it. This could get expensive though, slightly different service.
