from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from backend.services.llm.llm_service import call_llm
from backend.models.schemas import ChatRequest

router = APIRouter(
  prefix='/llm',
  tags=["llm"]
)

@router.post("/chat/stream")
async def llm_chat_stream(req: ChatRequest):
  try:
    print("Calling API")
    return StreamingResponse(
        call_llm(messages=req.messages, stream=True),
        media_type="text/plain"
    )
  except Exception as exc:
    raise HTTPException(status_code=500, detail=str(exc))
