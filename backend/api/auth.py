# backend/api/auth.py
import os
import jwt
from fastapi import HTTPException, Request
from clerk_backend_api import Clerk
from clerk_backend_api.security.types import AuthenticateRequestOptions
from backend.services.neo4j import query

# Initialize Clerk client
clerk_client = Clerk(bearer_auth=os.getenv("CLERK_SECRET_KEY"))


def ensure_user_exists(user_id: str):
    """
    Ensure a User node exists in Neo4j for the given user_id.
    Creates the user if they don't exist.
    """
    try:
        result = query(
            """
            MERGE (u:User {id: $user_id})
            ON CREATE SET u.created_at = datetime(), u.updated_at = datetime()
            ON MATCH SET u.updated_at = datetime()
            RETURN u.id as id
            """,
            user_id=user_id,
        )
        return result
    except Exception as e:
        print(f"❌ Error ensuring user exists: {str(e)}")
        # Don't fail auth if user creation fails, just log it
        pass


async def get_current_user(request: Request) -> str:
    """
    Authenticate request using Clerk SDK and return user_id
    """
    try:
        auth_header = request.headers.get("authorization")

        if not auth_header or not auth_header.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Missing authorization header")

        token = auth_header.split(" ")[1]

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
                ]
            ),
        )

        if not request_state.is_signed_in:
            raise HTTPException(status_code=401, detail="Not authenticated")

        # Get user_id from the payload
        if hasattr(request_state, "payload") and request_state.payload:
            user_id = request_state.payload.get("sub")
            if user_id:
                # Ensure user exists in Neo4j database
                ensure_user_exists(user_id)
                return user_id

        decoded = jwt.decode(token, options={"verify_signature": False})

        user_id = decoded.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="No user ID in token")

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
