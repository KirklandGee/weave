from fastapi import APIRouter, Depends, HTTPException
from backend.services.neo4j import query
from backend.api.auth import get_current_user
from typing import Dict, Any
import time

router = APIRouter(prefix="/chat-cleanup", tags=["chat-cleanup"])

CHAT_RETENTION_DAYS = 30

@router.post("/cleanup/{campaign_slug}")
async def cleanup_expired_chats(
    campaign_slug: str,
    user_id: str = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Clean up chat sessions and messages older than 30 days.
    This should be called by the frontend sync process.
    """
    try:
        # Calculate cutoff timestamp (30 days ago)
        cutoff_timestamp = int((time.time() - (CHAT_RETENTION_DAYS * 24 * 60 * 60)) * 1000)
        
        # First, check if ChatSession nodes exist at all
        check_query = """
        MATCH (c:ChatSession)
        RETURN count(c) as total_chats
        LIMIT 1
        """
        
        check_result = query(check_query, {})
        
        if not check_result or check_result[0]["total_chats"] == 0:
            return {
                "success": True,
                "deleted_chats": 0,
                "deleted_messages": 0,
                "message": "No chat sessions exist yet"
            }
        
        # Get count of expired chats for reporting
        count_query = """
        OPTIONAL MATCH (c:ChatSession {ownerId: $user_id, campaignId: $campaign_id})
        WHERE c.updatedAt < $cutoff_timestamp
        RETURN count(c) as expired_count
        """
        
        count_result = query(
            count_query,
            {
                "user_id": user_id,
                "campaign_id": campaign_slug if campaign_slug != "global" else None,
                "cutoff_timestamp": cutoff_timestamp
            }
        )
        
        expired_count = count_result[0]["expired_count"] if count_result else 0
        
        if expired_count == 0:
            return {
                "success": True,
                "deleted_chats": 0,
                "deleted_messages": 0,
                "message": "No expired chats found"
            }
        
        # Get count of messages that will be deleted
        message_count_query = """
        OPTIONAL MATCH (c:ChatSession {ownerId: $user_id, campaignId: $campaign_id})-[:HAS_MESSAGE]->(m:ChatMessage)
        WHERE c.updatedAt < $cutoff_timestamp
        RETURN count(m) as message_count
        """
        
        message_count_result = query(
            message_count_query,
            {
                "user_id": user_id,
                "campaign_id": campaign_slug if campaign_slug != "global" else None,
                "cutoff_timestamp": cutoff_timestamp
            }
        )
        
        message_count = message_count_result[0]["message_count"] if message_count_result else 0
        
        # Delete expired chat messages first
        delete_messages_query = """
        OPTIONAL MATCH (c:ChatSession {ownerId: $user_id, campaignId: $campaign_id})-[:HAS_MESSAGE]->(m:ChatMessage)
        WHERE c IS NOT NULL AND c.updatedAt < $cutoff_timestamp
        DETACH DELETE m
        """
        
        query(
            delete_messages_query,
            {
                "user_id": user_id,
                "campaign_id": campaign_slug if campaign_slug != "global" else None,
                "cutoff_timestamp": cutoff_timestamp
            }
        )
        
        # Then delete the chat sessions
        delete_chats_query = """
        OPTIONAL MATCH (c:ChatSession {ownerId: $user_id, campaignId: $campaign_id})
        WHERE c IS NOT NULL AND c.updatedAt < $cutoff_timestamp
        DETACH DELETE c
        """
        
        query(
            delete_chats_query,
            {
                "user_id": user_id,
                "campaign_id": campaign_slug if campaign_slug != "global" else None,
                "cutoff_timestamp": cutoff_timestamp
            }
        )
        
        return {
            "success": True,
            "deleted_chats": expired_count,
            "deleted_messages": message_count,
            "cutoff_date": cutoff_timestamp,
            "message": f"Cleaned up {expired_count} chat sessions and {message_count} messages older than {CHAT_RETENTION_DAYS} days"
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Chat cleanup failed: {str(e)}"
        )

@router.get("/status/{campaign_slug}")
async def get_cleanup_status(
    campaign_slug: str,
    user_id: str = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get information about chats that will be cleaned up.
    """
    try:
        # Calculate cutoff timestamp (30 days ago)
        cutoff_timestamp = int((time.time() - (CHAT_RETENTION_DAYS * 24 * 60 * 60)) * 1000)
        
        # Count expired chats
        count_query = """
        OPTIONAL MATCH (c:ChatSession {ownerId: $user_id, campaignId: $campaign_id})
        WHERE c.updatedAt < $cutoff_timestamp
        RETURN count(c) as expired_count
        """
        
        count_result = query(
            count_query,
            {
                "user_id": user_id,
                "campaign_id": campaign_slug if campaign_slug != "global" else None,
                "cutoff_timestamp": cutoff_timestamp
            }
        )
        
        expired_count = count_result[0]["expired_count"] if count_result else 0
        
        # Count total chats
        total_query = """
        OPTIONAL MATCH (c:ChatSession {ownerId: $user_id, campaignId: $campaign_id})
        RETURN count(c) as total_count
        """
        
        total_result = query(
            total_query,
            {
                "user_id": user_id,
                "campaign_id": campaign_slug if campaign_slug != "global" else None,
            }
        )
        
        total_count = total_result[0]["total_count"] if total_result else 0
        
        return {
            "total_chats": total_count,
            "expired_chats": expired_count,
            "retention_days": CHAT_RETENTION_DAYS,
            "cutoff_timestamp": cutoff_timestamp
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get cleanup status: {str(e)}"
        )