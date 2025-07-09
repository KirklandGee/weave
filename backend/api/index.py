from fastapi import FastAPI
from .routers import campaigns, notes, sync

app = FastAPI()

app.include_router(campaigns.router)
app.include_router(notes.router)
app.include_router(sync.router)

@app.get("/")
async def root():
    return {"message": "Hello World"}