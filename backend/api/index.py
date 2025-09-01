from dotenv import load_dotenv

load_dotenv()
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import campaigns, notes, sync, llm, embed, search, admin, chat_cleanup

app = FastAPI()

# Add startup event to verify Neo4j connection
@app.on_event("startup")
async def startup_event():
    print("🚀 FastAPI starting up...")
    try:
        from backend.services.neo4j import verify
        verify()
        print("✅ Neo4j connection verified successfully!")
    except Exception as e:
        print(f"❌ Neo4j connection failed during startup: {e}")
        # Don't raise here - let the app start but log the issue

# Configure CORS for multiple origins
import os

origins = [
    "http://localhost:3000",  # Marketing site
    "http://localhost:3001",  # App
    "http://app.localhost:3001",  # App via subdomain
    "http://localhost:3080",  # Proxy server
    "http://app.localhost:3080",  # Proxy server with subdomain
    "https://use-weave.app",  # Production frontend
    "https://weave-app-backend-production.up.railway.app",  # Railway backend (for any internal calls)
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
if os.getenv("PRODUCTION_DOMAIN"):
    origins.extend(
        [
            f"https://{os.getenv('PRODUCTION_DOMAIN')}",
            f"https://www.{os.getenv('PRODUCTION_DOMAIN')}",
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
app.include_router(chat_cleanup.router)


@app.get("/")
async def root():
    return {"message": "Hello World"}


@app.get("/health")
async def health():
    """Simple health check that always returns healthy."""
    return {"status": "healthy", "message": "Service is running"}
