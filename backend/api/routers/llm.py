from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from backend.services.llm.ollama import call_ollama_stream
from backend.models.llm import ChatRequest

router = APIRouter(
  prefix='/llm',
  tags=["llm"]
)

@router.post("/chat/stream")
async def llm_chat_stream_async(req: ChatRequest):
  try:
    return StreamingResponse(
        call_ollama_stream(req.user, req.system),
        media_type="text/plain"
    )
  except Exception as exc:
    raise HTTPException(status_code=500, detail=str(exc))
