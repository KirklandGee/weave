from fastapi import FastAPI
from .routers import campaigns, notes, sync, llm, embed, search

app = FastAPI()

app.include_router(campaigns.router)
app.include_router(notes.router)
app.include_router(sync.router)
app.include_router(llm.router)
app.include_router(search.router)
app.include_router(embed.router)

@app.get("/")
async def root():
    return {"message": "Hello World"}