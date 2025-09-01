# backend/api/auth.py
import os
import jwt
import time
from typing import Optional
from fastapi import HTTPException, Request
from clerk_backend_api import Clerk
from clerk_backend_api.security.types import AuthenticateRequestOptions
from backend.services.neo4j import query

# Initialize Clerk client
clerk_client = Clerk(bearer_auth=os.getenv("CLERK_SECRET_KEY"))

# In-memory caches for authentication optimization
_auth_cache = {}  # token -> (user_id, timestamp)
_user_cache = set()  # set of user_ids that exist in database
AUTH_CACHE_TTL = 300  # 5 minutes in seconds


def ensure_user_exists(user_id: str):
    """
    Ensure a User node exists in Neo4j for the given user_id.
    Creates the user if they don't exist. Uses cache to avoid redundant queries.
    """
    # Check cache first
    if user_id in _user_cache:
        return
    
    try:
        result = query(
            """
            MERGE (u:User {id: $user_id})
            ON CREATE SET u.createdAt = timestamp(), u.updatedAt = timestamp()
            ON MATCH SET u.updatedAt = timestamp()
            RETURN u.id as id
            """,
            user_id=user_id,
        )
        # Add to cache after successful query
        _user_cache.add(user_id)
        return result
    except Exception as e:
        print(f"❌ Error ensuring user exists: {str(e)}")
        # Don't fail auth if user creation fails, just log it
        pass


def _is_cache_valid(timestamp: float) -> bool:
    """Check if cache entry is still valid based on TTL."""
    return time.time() - timestamp < AUTH_CACHE_TTL


def _get_cached_auth(token: str) -> Optional[str]:
    """Get cached authentication result if valid."""
    if token in _auth_cache:
        user_id, timestamp = _auth_cache[token]
        if _is_cache_valid(timestamp):
            return user_id
        else:
            # Remove expired entry
            del _auth_cache[token]
    return None


def _cache_auth(token: str, user_id: str):
    """Cache authentication result."""
    _auth_cache[token] = (user_id, time.time())


async def get_current_user(request: Request) -> str:
    """
    Authenticate request using Clerk SDK and return user_id.
    Uses caching to reduce authentication latency.
    """
    try:
        auth_header = request.headers.get("authorization")

        if not auth_header or not auth_header.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Missing authorization header")

        token = auth_header.split(" ")[1]

        # Check cache first
        cached_user_id = _get_cached_auth(token)
        if cached_user_id:
            # Still ensure user exists (cached separately)
            ensure_user_exists(cached_user_id)
            return cached_user_id

        # Use Clerk's built-in authentication
        request_state = clerk_client.authenticate_request(
            request,
            AuthenticateRequestOptions(
                authorized_parties=[
                    "http://localhost:3000",
                    "https://localhost:3000",
                    "http://app.localhost:3001",
                    "http://localhost:3001",
                    "https://localhost:3001",
                    "https://use-weave.app",  # Production frontend
                    "https://www.use-weave.app",  # Production frontend
                    "https://my.use-weave.app",  # App subdomain
                    "https://weave-app-git-main-kirkland-gees-projects.vercel.app",  # Git preview deployments
                ]
            ),
        )

        if not request_state.is_signed_in:
            raise HTTPException(status_code=401, detail="Not authenticated")

        user_id = None
        # Get user_id from the payload
        if hasattr(request_state, "payload") and request_state.payload:
            user_id = request_state.payload.get("sub")
        
        if not user_id:
            # Fallback to JWT decode
            decoded = jwt.decode(token, options={"verify_signature": False})
            user_id = decoded.get("sub")
            
        if not user_id:
            raise HTTPException(status_code=401, detail="No user ID in token")

        # Cache the successful authentication
        _cache_auth(token, user_id)
        
        # Ensure user exists in Neo4j database
        ensure_user_exists(user_id)

        return user_id

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Authentication error: {str(e)}")
        print(f"❌ Error type: {type(e)}")
        import traceback

        print(f"❌ Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")
