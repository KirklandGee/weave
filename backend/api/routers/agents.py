from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import StreamingResponse
from backend.services.llm.llm_service import call_llm
from backend.services.llm.template_manager import template_manager
from backend.models.schemas import ChatRequest, TemplateInfo, AsyncTemplateRequest
from backend.api.auth import get_current_user
from backend.services.queue_service import get_task_queue
from datetime import datetime
import asyncio

router = APIRouter(prefix="/agents", tags=["agents"])


@router.post("/chat/stream")
async def agent_chat_stream(req: ChatRequest, user_id: str = Depends(get_current_user)):
    try:
        return StreamingResponse(
            call_llm(
                messages=req.messages,
                context=req.context,
                user_id=user_id,
                stream=True,
            ),
            media_type="text/plain",
        )
    except HTTPException:
        # Re-raise HTTP exceptions (like 429 for usage limits)
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

