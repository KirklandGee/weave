from dotenv import load_dotenv

load_dotenv()
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import campaigns, notes, sync, llm, embed, search, admin

app = FastAPI()

# Configure CORS for multiple origins
import os

origins = [
    "http://localhost:3000",  # Marketing site
    "http://localhost:3001",  # App
    "http://app.localhost:3001",  # App via subdomain
    "http://localhost:3080",  # Proxy server
    "http://app.localhost:3080",  # Proxy server with subdomain
]

# Add production origins from environment
if os.getenv("FRONTEND_URL"):
    origins.append(os.getenv("FRONTEND_URL"))
if os.getenv("FRONTEND_DOMAIN"):
    origins.extend(
        [
            f"https://{os.getenv('FRONTEND_DOMAIN')}",
            f"https://www.{os.getenv('FRONTEND_DOMAIN')}",
        ]
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
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
app.include_router(admin.router)


@app.get("/")
async def root():
    return {"message": "Hello World"}


@app.get("/health")
async def health():
    return {"status": "healthy"}
