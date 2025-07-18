from dotenv import load_dotenv
load_dotenv()
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import campaigns, notes, sync, llm, embed, search

app = FastAPI()

# Configure CORS for multiple origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Marketing site
        "http://localhost:3001",  # App
        "http://app.localhost:3001",  # App via subdomain
        "http://localhost:3080",  # Proxy server
        "http://app.localhost:3080",  # Proxy server with subdomain
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(campaigns.router)
app.include_router(notes.router)
app.include_router(sync.router)
app.include_router(llm.router)
app.include_router(search.router)
app.include_router(embed.router)

@app.get("/")
async def root():
    return {"message": "Hello World"}