# backend/api/auth.py
import os
import jwt
from fastapi import HTTPException, Request
from clerk_backend_api import Clerk
from clerk_backend_api.security.types import AuthenticateRequestOptions

# Initialize Clerk client
clerk_client = Clerk(bearer_auth=os.getenv('CLERK_SECRET_KEY'))

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
                authorized_parties=['http://localhost:3000', 'https://localhost:3000']
            )
        )
        
        if not request_state.is_signed_in:
            raise HTTPException(status_code=401, detail="Not authenticated")
        
        # Get user_id from the payload
        if hasattr(request_state, 'payload') and request_state.payload:
            user_id = request_state.payload.get("sub")
            if user_id:
                return user_id
        
        decoded = jwt.decode(token, options={"verify_signature": False})
        
        user_id = decoded.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="No user ID in token")
        return user_id
              
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Authentication error: {str(e)}")
        print(f"❌ Error type: {type(e)}")
        import traceback
        print(f"❌ Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")