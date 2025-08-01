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
    "https://weave-rpg-nghr2438s8tj.vercel.app",  # Production frontend
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
    """Health check endpoint that verifies dependencies."""
    health_status = {"status": "healthy", "checks": {}}
    overall_healthy = True
    
    # Check Neo4j connection
    try:
        from backend.services.neo4j import verify
        verify()
        health_status["checks"]["neo4j"] = "healthy"
    except Exception as e:
        health_status["checks"]["neo4j"] = f"unhealthy: {str(e)}"
        overall_healthy = False
    
    # Check Redis connection (if available)
    try:
        from backend.services.queue_service import health_check
        if health_check():
            health_status["checks"]["redis"] = "healthy"
        else:
            health_status["checks"]["redis"] = "unhealthy"
            overall_healthy = False
    except Exception as e:
        health_status["checks"]["redis"] = f"unavailable: {str(e)}"
        # Don't fail overall health for Redis since it might be optional
    
    if not overall_healthy:
        health_status["status"] = "degraded"
        # Don't fail the health check during initial deployment
        # This allows us to see what's actually failing in the logs
    
    return health_status
