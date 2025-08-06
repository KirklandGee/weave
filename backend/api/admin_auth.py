# backend/api/admin_auth.py
import os
from fastapi import HTTPException, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional

# API key from environment variable (optional)
ADMIN_API_KEY = os.getenv("ADMIN_API_KEY")

security = HTTPBearer()

async def get_admin_api_key(credentials: Optional[HTTPAuthorizationCredentials] = None) -> str:
    """
    Authenticate admin requests using API key.
    """
    if not credentials:
        # Check for API key in headers as fallback
        raise HTTPException(status_code=401, detail="Missing API key")
    
    if credentials.credentials != ADMIN_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")
    
    return credentials.credentials

async def get_admin_api_key_from_header(request: Request) -> str:
    """
    Alternative method to get API key from X-API-Key header.
    """
    if not ADMIN_API_KEY:
        raise HTTPException(
            status_code=503, 
            detail="Admin API key not configured. Set ADMIN_API_KEY environment variable to enable this endpoint."
        )
    
    api_key = request.headers.get("X-API-Key")
    if not api_key:
        api_key = request.headers.get("x-api-key")  # case insensitive fallback
    
    if not api_key:
        raise HTTPException(status_code=401, detail="Missing X-API-Key header")
    
    if api_key != ADMIN_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")
    
    return api_key