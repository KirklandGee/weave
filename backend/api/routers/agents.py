import json
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Dict, Any
from backend.services.llm.llm_service import call_llm_with_tools, execute_approved_tools
from backend.services.llm.tools.tools import get_campaign_tools
from backend.services.llm.prompt_registry import PromptRegistry
from backend.models.schemas import LLMMessage
from backend.api.auth import get_current_user

router = APIRouter(prefix="/agent", tags=["agent"])

# Initialize prompt registry
prompt_registry = PromptRegistry()

def get_agent_system_message() -> str:
    """Get the agent system message from the prompt registry."""
    try:
        template_config = prompt_registry.reload_template("agent_assistant")
        if template_config and template_config.system_message:
            return template_config.system_message
    except Exception as e:
        print(f"Warning: Could not load agent system message: {e}")
    
    # Fallback system message
    return "You are an intelligent D&D campaign assistant with access to tools to help manage campaign content. Always use the available tools when creating, searching, or updating campaign content."

def prepare_messages_with_system_prompt(messages: List[LLMMessage]) -> List[LLMMessage]:
    """Add agent system message if not already present."""
    # Check if there's already a system message
    has_system_message = any(msg.role == "system" for msg in messages)
    
    if not has_system_message:
        system_message = LLMMessage(
            role="system",
            content=get_agent_system_message()
        )
        return [system_message] + messages
    
    return messages

class AgentChatRequest(BaseModel):
    messages: List[LLMMessage]
    campaign_id: str
    context: str = ""
    max_iterations: int = 3

class ToolExecutionRequest(BaseModel):
    messages: List[LLMMessage]
    approved_tool_calls: List[Dict[str, Any]]
    campaign_id: str
    context: str = ""

@router.post("/chat", tags=["agents"])
async def agent_chat(
    request: AgentChatRequest,
    current_user = Depends(get_current_user)
):
    """
    Start an agent conversation. Returns either tool calls for approval or streams response.
    """
    try:
        user_id = current_user  # get_current_user returns string directly
        
        # Get campaign-specific tools with bound context
        tools = get_campaign_tools(user_id, request.campaign_id)
        
        # Prepare messages with agent system prompt
        prepared_messages = prepare_messages_with_system_prompt(request.messages)
        
        # Call LLM with tools (execution disabled for approval workflow)
        async def generate_response():
            async for response_chunk in call_llm_with_tools(
                messages=prepared_messages,
                tools=tools,
                context=request.context,
                user_id=user_id,
                max_iterations=request.max_iterations,
                execute_tools=False  # Return tool calls for approval
            ):
                yield f"data: {json.dumps(response_chunk)}\n\n"
        
        return StreamingResponse(
            generate_response(),
            media_type="text/plain",
            headers={"Cache-Control": "no-cache"}
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/execute", tags=["agents"]) 
async def execute_agent_tools(
    request: ToolExecutionRequest,
    current_user = Depends(get_current_user)
):
    """Execute approved tools and return simple JSON response."""
    print(f"🟦 EXECUTE endpoint called with {len(request.approved_tool_calls)} tool calls")
    print(f"🟦 Tool calls: {request.approved_tool_calls}")
    print(f"🟦 Campaign ID: {request.campaign_id}")
    
    try:
        user_id = current_user  # get_current_user returns string directly
        print(f"🟦 User ID: {user_id}")
        
        # Get tools with bound context
        tools = get_campaign_tools(user_id, request.campaign_id)
        print(f"🟦 Got {len(tools)} tools: {[t.name for t in tools]}")
        
        # Execute tools synchronously
        results = []
        for tool_call_info in request.approved_tool_calls:
            print(f"🟦 Executing tool: {tool_call_info['name']}")
            try:
                tool = next((t for t in tools if t.name == tool_call_info["name"]), None)
                if tool:
                    result = tool.invoke(tool_call_info["args"])
                    results.append({
                        "tool_name": tool_call_info["name"],
                        "status": "success", 
                        "result": str(result)
                    })
                    print(f"🟦 Tool {tool_call_info['name']} completed: {str(result)[:100]}...")
                else:
                    results.append({
                        "tool_name": tool_call_info["name"],
                        "status": "error",
                        "result": f"Tool {tool_call_info['name']} not found"
                    })
            except Exception as e:
                print(f"❌ Error executing tool {tool_call_info['name']}: {str(e)}")
                results.append({
                    "tool_name": tool_call_info["name"],
                    "status": "error", 
                    "result": str(e)
                })
        
        return {"results": results}
        
    except Exception as e:
        print(f"❌ Execute endpoint error: {str(e)}")
        import traceback
        print(f"❌ Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))
