from langchain_core.messages import HumanMessage, SystemMessage, ToolMessage
from backend.models.schemas import LLMMessage
from .llm_providers import get_llm_instance
from .config import ROLE_MAP, DEFAULT_LLM_CONFIG
from .token_counter import TokenCounter
from backend.observability.trace import traced
from backend.services.usage_service import UsageService
from tenacity import retry, stop_after_attempt, wait_random, retry_if_exception_type
from fastapi import HTTPException
from typing import Optional, Dict, Any, AsyncGenerator
import json


def check_usage_limits(user_id: str, model: str, input_tokens: int, config: dict):
    """Check if user can make a request without exceeding usage limits."""
    if user_id:
        # Estimate cost for this request
        max_tokens = config.get("max_tokens", 4096)
        estimated_output_tokens = TokenCounter.estimate_response_tokens(
            model, max_tokens
        )
        estimated_cost = UsageService.calculate_cost(
            model, input_tokens, estimated_output_tokens
        )

        # Check if user can afford this request
        if not UsageService.check_usage_limit(user_id, estimated_cost):
            usage_summary = UsageService.get_usage_summary(user_id)
            raise HTTPException(
                status_code=429,
                detail=f"Usage limit exceeded. Current usage: ${usage_summary.current_month_usage:.4f}, "
                f"Limit: ${usage_summary.monthly_limit:.2f}, "
                f"Estimated cost: ${estimated_cost:.4f}",
            )


# Alternative: Always ensure there's a system message
def to_langchain_messages(messages, context=""):
    langchain_messages = []
    
    # STATIC CONTENT FIRST (cacheable)
    # Add system messages without context injection to maximize caching
    for msg in messages:
        if msg.role == "system":
            langchain_messages.append(SystemMessage(content=msg.content))
    
    # Add context as separate system message if provided
    # This keeps static system prompts cacheable while adding dynamic context
    if context:
        langchain_messages.append(SystemMessage(content=f"Additional Context:\n{context}"))
    
    # DYNAMIC CONTENT LAST
    # Add non-system messages at the end
    for msg in messages:
        if msg.role != "system":
            langchain_messages.append(
                ROLE_MAP.get(msg.role, HumanMessage)(content=msg.content)
            )
    
    return langchain_messages


@retry(
    stop=stop_after_attempt(3),
    wait=wait_random(1, 2),
    retry=retry_if_exception_type((TimeoutError, ConnectionError)),
)
@traced("llm_call")
async def call_llm(
    messages: list[LLMMessage],
    context: str,
    user_id: Optional[str] = None,
    stream: bool = True,
    campaign_id: Optional[str] = None,
    session_id: Optional[str] = None,
    **overrides,
):
    if isinstance(messages, LLMMessage):
        messages = [messages]

    # Merge default config and per-call overrides (overrides win)
    config = {**DEFAULT_LLM_CONFIG, **overrides}
    model = config.get("model", DEFAULT_LLM_CONFIG["model"])

    # Convert to langchain messages
    langchain_messages = to_langchain_messages(messages, context=context)

    # Count input tokens
    input_tokens = TokenCounter.count_tokens_in_langchain_messages(
        langchain_messages, model
    )

    # Check usage limits if user_id is provided
    check_usage_limits(user_id, model, input_tokens, config)

    llm = get_llm_instance(config)
    full_response = ""

    try:
        if stream:
            async for chunk in llm.astream(langchain_messages):
                chunk_text = chunk.text()
                full_response += chunk_text
                yield chunk_text
        else:
            result = await llm.ainvoke(langchain_messages)
            full_response = str(result.text())
            yield full_response

        # Record usage after successful completion
        if user_id and full_response:
            output_tokens = TokenCounter.count_tokens_in_text(full_response, model)
            UsageService.record_usage(
                user_id=user_id,
                model=model,
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                campaign_id=campaign_id,
                session_id=session_id,
            )

    except Exception as e:
        print("status=error")
        print(f"error={str(e)}")
        raise

async def call_llm_with_tools(
    messages: list[LLMMessage],
    tools: list = None,
    context: str = "",
    user_id: str = "",
    campaign_id: str = "",
    max_iterations: int = 3,
    execute_tools: bool = True,
    **overrides,
) -> AsyncGenerator[Dict[str, Any], None]:
    """
    Enhanced LLM call that supports tool calling with approval workflow.
    
    Args:
        messages: Conversation history
        tools: List of available tools
        execute_tools: If False, returns tool calls for approval instead of executing
        max_iterations: Max tool calling loops to prevent infinite cycles
    
    Yields:
        Dict with 'type' and 'content' keys for different response types
    """

    if isinstance(messages, LLMMessage):
        messages = [messages]

    # Merge config and convert messages
    config = {**DEFAULT_LLM_CONFIG, **overrides}
    langchain_messages = to_langchain_messages(messages, context=context)

    # Count input tokens
    input_tokens = TokenCounter.count_tokens_in_langchain_messages(langchain_messages, config.get("model"))

    # Check usage limits
    check_usage_limits(user_id, config.get("model"), input_tokens, config)

    # Get LLM instance
    llm = get_llm_instance(config)
    
    # Bind tools if provided
    if tools:
        llm = llm.bind_tools(tools)

    conversation_messages = langchain_messages.copy()

    for _ in range(max_iterations):
        try:
            # Get LLM response
            response = await llm.ainvoke(conversation_messages)
            
            # Check if tools were called
            if hasattr(response, 'tool_calls') and response.tool_calls:
                
                if not execute_tools:
                    # Return tool calls for user approval
                    tool_calls_info = []
                    for tool_call in response.tool_calls:
                        tool_calls_info.append({
                            "id": tool_call["id"],
                            "name": tool_call["name"],
                            "description": f"Call {tool_call['name']} with arguments: {json.dumps(tool_call['args'], indent=2)}",
                            "args": tool_call["args"]
                        })
                    
                    yield {
                        "type": "tool_calls",
                        "tool_calls": tool_calls_info,
                        "ai_message": response.content
                    }
                    return
                
                # Execute tools and continue conversation
                tool_results = []
                for tool_call in response.tool_calls:
                    try:
                        # Find and execute the tool
                        tool = next((t for t in tools if t.name == tool_call["name"]), None)
                        if not tool:
                            result = f"Error: Tool {tool_call['name']} not found"
                        else:
                            result = tool.invoke(tool_call["args"])
                        
                        tool_message = ToolMessage(
                            content=str(result),
                            tool_call_id=tool_call["id"]
                        )
                        conversation_messages.append(tool_message)
                        tool_results.append(result)
                        
                        # Yield tool execution update
                        yield {
                            "type": "tool_result", 
                            "tool_name": tool_call["name"],
                            "result": str(result)
                        }
                        
                    except Exception as e:
                        error_msg = f"Error executing {tool_call['name']}: {str(e)}"
                        tool_message = ToolMessage(
                            content=error_msg,
                            tool_call_id=tool_call["id"]
                        )
                        conversation_messages.append(tool_message)
                        
                        yield {
                            "type": "tool_error",
                            "tool_name": tool_call["name"], 
                            "error": str(e)
                        }
                
                # Continue to next iteration to get final response
                continue
                
            else:
                # No tools called - return final response
                yield {
                    "type": "final_response",
                    "content": response.content
                }
                
                # Record usage (existing logic)
                if user_id and response.content:
                    output_tokens = TokenCounter.count_tokens_in_text(response.content, config.get("model"))
                    UsageService.record_usage(
                        user_id=user_id,
                        model=config.get("model"),
                        input_tokens=input_tokens,
                        output_tokens=output_tokens
                    )
                return
                
        except Exception as e:
            yield {
                "type": "error",
                "error": str(e)
            }
            return
    
    # Max iterations reached
    yield {
        "type": "error", 
        "error": f"Maximum tool calling iterations ({max_iterations}) reached"
    }

async def execute_approved_tools(
    messages: list[LLMMessage],
    approved_tool_calls: list[Dict],
    tools: list,
    context: str = "",
    user_id: Optional[str] = None,
    **overrides
) -> AsyncGenerator[str, None]:
    """Execute approved tools and get final LLM response."""
    print(f"🔧 execute_approved_tools called with {len(approved_tool_calls)} tool calls")
    
    from langchain_core.messages import AIMessage
    
    conversation_messages = to_langchain_messages(messages, context=context)
    print(f"🔧 Converted to {len(conversation_messages)} langchain messages")
    
    # Add assistant message with tool calls (required by OpenAI API)
    tool_calls_for_ai_message = []
    for tool_call_info in approved_tool_calls:
        tool_calls_for_ai_message.append({
            "name": tool_call_info["name"],
            "args": tool_call_info["args"],
            "id": tool_call_info["id"],
            "type": "tool_call"
        })
    
    ai_message = AIMessage(
        content="I'll execute the approved tools now.",
        tool_calls=tool_calls_for_ai_message
    )
    conversation_messages.append(ai_message)
    
    # Execute approved tools
    print(f"🔧 Starting tool execution with {len(approved_tool_calls)} approved tool calls")
    print(f"🔧 Tool calls data: {approved_tool_calls}")
    
    for i, tool_call_info in enumerate(approved_tool_calls):
        print(f"🔧 Processing tool call {i+1}: {tool_call_info.get('name')}")
        print(f"🔧 Available tools: {[t.name for t in tools]}")
        try:
            tool = next((t for t in tools if t.name == tool_call_info["name"]), None)
            if tool:
                print(f"🔧 Found tool {tool.name}, invoking with args: {tool_call_info['args']}")
                result = tool.invoke(tool_call_info["args"])
                print(f"🔧 Tool execution result: {str(result)}")
                tool_message = ToolMessage(
                    content=str(result),
                    tool_call_id=tool_call_info["id"]
                )
                conversation_messages.append(tool_message)
                print(f"🔧 Added tool message to conversation")
            else:
                print(f"❌ Tool {tool_call_info['name']} not found in available tools")
                error_message = ToolMessage(
                    content=f"Error: Tool {tool_call_info['name']} not found",
                    tool_call_id=tool_call_info["id"]
                )
                conversation_messages.append(error_message)
        except Exception as e:
            print(f"❌ Error executing tool {tool_call_info['name']}: {str(e)}")
            import traceback
            print(f"❌ Traceback: {traceback.format_exc()}")
            error_message = ToolMessage(
                content=f"Error: {str(e)}",
                tool_call_id=tool_call_info["id"]
            )
            conversation_messages.append(error_message)
    
    print(f"🔧 Finished tool execution, conversation has {len(conversation_messages)} messages")
    
    # Get final response from LLM
    config = {**DEFAULT_LLM_CONFIG, **overrides}
    llm = get_llm_instance(config)
    
    # Accumulate content to avoid character-by-character streaming
    accumulated_content = ""
    async for chunk in llm.astream(conversation_messages):
        if hasattr(chunk, 'content') and chunk.content:
            accumulated_content += chunk.content
            # Yield accumulated content in reasonable chunks (e.g., when we hit whitespace or punctuation)
            if accumulated_content.endswith((' ', '\n', '.', '!', '?', ':', ';', ',')):
                yield accumulated_content
                accumulated_content = ""
    
    # Yield any remaining content
    if accumulated_content:
        yield accumulated_content
