from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import StreamingResponse
from backend.services.agents.chat_agent import create_assistant
from backend.models.schemas import ChatRequest, LLMMessage
from backend.api.auth import get_current_user
from backend.services.subscription_service import SubscriptionService
from backend.services.agents.models import AssistantDependencies
from pydantic_ai.messages import SystemPromptPart, UserPromptPart, ModelResponse, TextPart, ModelRequest
import asyncio
import json

router = APIRouter(prefix="/agents", tags=["agents"])


def convert_to_pydantic_messages(messages: list[LLMMessage], context: str = "") -> list:
    """Convert LLMMessage list to PydanticAI message history, following caching pattern"""
    pydantic_messages = []
    
    # Add user-provided system messages first (from conversation)
    system_parts = []
    for msg in messages[:-1]:  # All but last message
        if msg.role == "system":
            system_parts.append(SystemPromptPart(content=msg.content))
    
    # Add dynamic context as system message if provided (like current pattern)
    if context:
        system_parts.append(SystemPromptPart(content=f"Campaign Context:\n{context}"))
    
    # If we have system parts, wrap them in ModelRequest
    if system_parts:
        pydantic_messages.append(ModelRequest(parts=system_parts))
    
    # Add conversation history (non-system messages)
    for msg in messages[:-1]:
        if msg.role == "human":
            pydantic_messages.append(ModelRequest(parts=[UserPromptPart(content=msg.content)]))
        elif msg.role == "ai":
            pydantic_messages.append(ModelResponse(parts=[TextPart(content=msg.content)]))
    
    return pydantic_messages


@router.post("/chat/stream")
async def agents_chat_stream(req: ChatRequest, request: Request, user_id: str = Depends(get_current_user)):
    try:
        # Check if user has AI access based on subscription plan using request auth
        if not SubscriptionService.has_ai_access_from_request(request):
            raise HTTPException(
                status_code=403,
                detail="AI features require a paid subscription. Please upgrade your plan to access AI chat."
            )
        
        # Create the streaming response
        return StreamingResponse(
            agent_stream_generator(req, user_id),
            media_type="application/json",
        )
    except HTTPException:
        # Re-raise HTTP exceptions (like 403 for plan restrictions or 429 for usage limits)
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


async def agent_stream_generator(req: ChatRequest, user_id: str):
    """Generate streaming JSON responses with text chunks and tool events"""
    try:
        campaign_id = req.campaign_id
        
        # Convert messages to PydanticAI format
        message_history = convert_to_pydantic_messages(req.messages, req.context)
        current_prompt = req.messages[-1].content if req.messages else ""
        
        # Create assistant and dependencies
        agent = create_assistant()
        deps = AssistantDependencies(
            campaign_id=campaign_id,
            user_id=user_id,
        )
        
        # Track tool events - store them to yield later
        tool_events = []
        
        async def event_handler(ctx, event_stream):
            from pydantic_ai.messages import FunctionToolCallEvent, FunctionToolResultEvent
            async for event in event_stream:
                if isinstance(event, FunctionToolCallEvent):
                    event_data = {
                        "type": "tool_call",
                        "content": f"🔧 Calling {event.part.tool_name}({event.part.args})"
                    }
                    tool_events.append(event_data)
                elif isinstance(event, FunctionToolResultEvent):
                    result_preview = str(event.result.content)[:100]
                    if len(str(event.result.content)) > 100:
                        result_preview += "..."
                    event_data = {
                        "type": "tool_result", 
                        "content": f"✅ Tool {event.tool_call_id} returned: {result_preview}"
                    }
                    tool_events.append(event_data)
        
        # Run agent with streaming
        async with agent.run_stream(
            current_prompt,
            deps=deps,
            message_history=message_history,
            event_stream_handler=event_handler
        ) as result:
            # First yield any tool events that happened
            for event_data in tool_events:
                yield f"{json.dumps(event_data)}\n"
            
            # Stream the text output
            final_output = None
            async for partial_output in result.stream_output():
                text_data = {
                    "type": "text",
                    "content": partial_output.message
                }
                yield f"{json.dumps(text_data)}\n"
                final_output = partial_output
            
            # Stream suggested actions if any (from final output)
            if final_output and final_output.suggested_actions:
                actions_data = {
                    "type": "suggested_actions",
                    "content": [action.dict() for action in final_output.suggested_actions]
                }
                yield f"{json.dumps(actions_data)}\n"
                
    except Exception as e:
        error_data = {
            "type": "error",
            "content": str(e)
        }
        yield f"{json.dumps(error_data)}\n"


