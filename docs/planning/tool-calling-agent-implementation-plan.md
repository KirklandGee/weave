# Complete Tool-Calling Agent Implementation Guide

## Phase 1: Backend Tool Functions

### File: `backend/services/llm/tools/note_tools.py`

```python
import json
import uuid
from datetime import datetime
from typing import Optional
from langchain.tools import tool
from backend.services.neo4j import query
from backend.services.embeddings.vector_search import get_vector_search_service

vector_service = get_vector_search_service()

@tool
def search_campaign_notes(
    query_text: str, 
    user_id: str, 
    campaign_id: str, 
    limit: int = 5
) -> str:
    """Search for relevant notes in the campaign using semantic similarity."""
    try:
        results = vector_service.search_nodes(
            query_text=query_text,
            user_id=user_id,
            campaign_id=campaign_id,
            limit=limit,
            threshold=0.7
        )
        
        if not results:
            return "No relevant notes found for your query."
            
        formatted = "## Found Notes:\n\n"
        for result in results:
            formatted += f"**{result.title}** (Type: {result.type})\n"
            # Truncate content to avoid context overflow
            content = result.markdown[:300] + "..." if len(result.markdown) > 300 else result.markdown
            formatted += f"{content}\n\n---\n\n"
            
        return formatted
    except Exception as e:
        return f"Error searching notes: {str(e)}"

@tool
def get_note_by_id(note_id: str, user_id: str) -> str:
    """Retrieve a specific note by its ID."""
    try:
        result = query("""
            MATCH (n:Note {id: $note_id})-[:PART_OF]->(c:Campaign)-[:OWNED_BY]->(u:User {clerk_id: $user_id})
            RETURN n.id as id, n.title as title, n.markdown as content, n.type as type
        """, note_id=note_id, user_id=user_id)
        
        if not result:
            return f"Note with ID {note_id} not found or you don't have access to it."
            
        note = result[0]
        return f"**{note['title']}** (Type: {note['type']})\n\n{note['content']}"
    except Exception as e:
        return f"Error retrieving note: {str(e)}"

@tool  
def create_campaign_note(
    title: str,
    content: str, 
    user_id: str,
    campaign_id: str,
    note_type: str = "Note"
) -> str:
    """Create a new note in the campaign."""
    try:
        note_id = f"agent-{uuid.uuid4().hex[:8]}"
        
        result = query("""
            MATCH (c:Campaign {campaign_id: $campaign_id})-[:OWNED_BY]->(u:User {clerk_id: $user_id})
            CREATE (n:Note {
                id: $note_id,
                title: $title,
                markdown: $content,
                type: $note_type,
                created_at: datetime(),
                updated_at: datetime()
            })-[:PART_OF]->(c)
            RETURN n.id as id, n.title as title
        """, 
        note_id=note_id, 
        title=title, 
        content=content, 
        campaign_id=campaign_id, 
        user_id=user_id, 
        note_type=note_type)
        
        if result:
            return f"✅ Created note '{result[0]['title']}' with ID: {result[0]['id']}"
        else:
            return "❌ Failed to create note - campaign not found or no permission"
    except Exception as e:
        return f"❌ Error creating note: {str(e)}"

@tool
def update_campaign_note(
    note_id: str,
    title: str,
    content: str, 
    user_id: str
) -> str:
    """Update an existing note's title and content."""
    try:
        result = query("""
            MATCH (n:Note {id: $note_id})-[:PART_OF]->(c:Campaign)-[:OWNED_BY]->(u:User {clerk_id: $user_id})
            SET n.title = $title, n.markdown = $content, n.updated_at = datetime()
            RETURN n.title as title, n.id as id
        """, note_id=note_id, title=title, content=content, user_id=user_id)
        
        if result:
            return f"✅ Updated note '{result[0]['title']}' (ID: {result[0]['id']})"
        else:
            return f"❌ Note {note_id} not found or no permission to update"
    except Exception as e:
        return f"❌ Error updating note: {str(e)}"

# Tool registry function
def get_campaign_tools(user_id: str, campaign_id: str):
    """Get tools bound with user and campaign context."""
    
    # Create bound versions that automatically include user_id and campaign_id
    def bind_context(tool_func):
        def wrapper(*args, **kwargs):
            # Inject context into kwargs
            kwargs['user_id'] = user_id
            kwargs['campaign_id'] = campaign_id
            return tool_func(*args, **kwargs)
        
        # Preserve tool metadata
        wrapper.name = tool_func.name
        wrapper.description = tool_func.description
        wrapper.args_schema = tool_func.args_schema
        return wrapper
    
    return [
        bind_context(search_campaign_notes),
        bind_context(get_note_by_id), 
        bind_context(create_campaign_note),
        bind_context(update_campaign_note)
    ]
```

**⚠️ Potential Issues:**
- **Security**: User ID injection - make sure this comes from authenticated session, not request body
- **Performance**: Vector search might be slow with large datasets
- **Context overflow**: Long notes could exceed LLM context window

---

## Phase 2: Enhanced LLM Service

### File: `backend/services/llm/llm_service.py` (additions)

```python
import json
from langchain_core.messages import ToolMessage
from typing import List, Dict, Any, AsyncGenerator, Optional

async def call_llm_with_tools(
    messages: List[LLMMessage],
    tools: List = None,
    context: str = "",
    user_id: Optional[str] = None,
    max_iterations: int = 3,
    execute_tools: bool = True,
    **overrides
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
    
    # Get LLM instance
    llm = get_llm_instance(config)
    
    # Bind tools if provided
    if tools:
        llm = llm.bind_tools(tools)
    
    # Count input tokens (existing logic)
    input_tokens = TokenCounter.count_tokens_in_langchain_messages(langchain_messages, config.get("model"))
    
    # Usage limit checking (existing logic)
    if user_id:
        # ... existing usage checking code ...
        pass
    
    conversation_messages = langchain_messages.copy()
    
    for iteration in range(max_iterations):
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
    messages: List[LLMMessage],
    approved_tool_calls: List[Dict],
    tools: List,
    context: str = "",
    user_id: Optional[str] = None,
    **overrides
) -> AsyncGenerator[str, None]:
    """Execute approved tools and get final LLM response."""
    
    conversation_messages = to_langchain_messages(messages, context=context)
    
    # Execute approved tools
    for tool_call_info in approved_tool_calls:
        try:
            tool = next((t for t in tools if t.name == tool_call_info["name"]), None)
            if tool:
                result = tool.invoke(tool_call_info["args"])
                tool_message = ToolMessage(
                    content=str(result),
                    tool_call_id=tool_call_info["id"]
                )
                conversation_messages.append(tool_message)
        except Exception as e:
            error_message = ToolMessage(
                content=f"Error: {str(e)}",
                tool_call_id=tool_call_info["id"]
            )
            conversation_messages.append(error_message)
    
    # Get final response from LLM
    config = {**DEFAULT_LLM_CONFIG, **overrides}
    llm = get_llm_instance(config)
    
    async for chunk in llm.astream(conversation_messages):
        yield chunk.content
```

**⚠️ Potential Issues:**
- **Infinite loops**: Tools calling tools calling tools - max_iterations helps but watch for this
- **Error handling**: Tool execution failures need graceful handling
- **Token counting**: Tool results add tokens - need to account for this in usage tracking
- **Memory**: Long tool conversations can get expensive fast

---

## Phase 3: Agent API Endpoints  

### File: `backend/api/routers/agents.py`

```python
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from backend.services.llm.llm_service import call_llm_with_tools, execute_approved_tools
from backend.services.llm.tools.note_tools import get_campaign_tools
from backend.models.schemas import LLMMessage
from backend.middleware.auth import get_current_user

router = APIRouter()

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

@router.post("/agent/chat", tags=["agents"])
async def agent_chat(
    request: AgentChatRequest,
    current_user = Depends(get_current_user)
):
    """
    Start an agent conversation. Returns either tool calls for approval or streams response.
    """
    try:
        user_id = current_user.clerk_id  # Or however you get user ID
        
        # Get campaign-specific tools with bound context
        tools = get_campaign_tools(user_id, request.campaign_id)
        
        # Call LLM with tools (execution disabled for approval workflow)
        async def generate_response():
            async for response_chunk in call_llm_with_tools(
                messages=request.messages,
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

@router.post("/agent/execute", tags=["agents"]) 
async def execute_agent_tools(
    request: ToolExecutionRequest,
    current_user = Depends(get_current_user)
):
    """Execute approved tools and stream final response."""
    try:
        user_id = current_user.clerk_id
        
        # Get tools with bound context
        tools = get_campaign_tools(user_id, request.campaign_id)
        
        async def stream_execution():
            async for chunk in execute_approved_tools(
                messages=request.messages,
                approved_tool_calls=request.approved_tool_calls,
                tools=tools,
                context=request.context,
                user_id=user_id
            ):
                yield f"data: {chunk}\n\n"
                
        return StreamingResponse(
            stream_execution(),
            media_type="text/plain", 
            headers={"Cache-Control": "no-cache"}
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Optional: Simple agent endpoint that auto-executes tools (for testing)
@router.post("/agent/auto", tags=["agents"])
async def agent_auto_execute(
    request: AgentChatRequest, 
    current_user = Depends(get_current_user)
):
    """Agent endpoint that auto-executes tools (no approval needed)."""
    try:
        user_id = current_user.clerk_id
        tools = get_campaign_tools(user_id, request.campaign_id)
        
        async def stream_auto():
            async for response_chunk in call_llm_with_tools(
                messages=request.messages,
                tools=tools,
                context=request.context,
                user_id=user_id,
                execute_tools=True  # Auto-execute tools
            ):
                if response_chunk["type"] == "final_response":
                    yield f"data: {response_chunk['content']}\n\n"
                elif response_chunk["type"] == "tool_result":
                    yield f"data: 🔧 {response_chunk['tool_name']}: {response_chunk['result']}\n\n"
                elif response_chunk["type"] == "error":
                    yield f"data: ❌ Error: {response_chunk['error']}\n\n"
        
        return StreamingResponse(stream_auto(), media_type="text/plain")
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

**⚠️ Potential Issues:**
- **Authentication**: Make sure `get_current_user` is properly implemented 
- **Rate limiting**: Agent calls could be expensive - consider rate limiting
- **Streaming errors**: SSE streams can be fragile - test error cases thoroughly
- **Timeout handling**: Long tool executions might timeout

---

## Phase 4: Frontend Tool Approval Component

### File: `apps/app/src/components/ToolApprovalModal.tsx`

```typescript
import React, { useState } from 'react';
import { X, CheckCircle, XCircle, Settings } from 'lucide-react';

interface ToolCall {
    id: string;
    name: string;
    description: string;
    args: Record<string, any>;
}

interface ToolApprovalModalProps {
    tools: ToolCall[];
    aiMessage?: string; // The AI's message before tool calls
    onApprove: (approvedTools: ToolCall[]) => void;
    onDecline: () => void;
    isExecuting?: boolean;
}

export function ToolApprovalModal({ 
    tools, 
    aiMessage, 
    onApprove, 
    onDecline, 
    isExecuting = false 
}: ToolApprovalModalProps) {
    const [selectedTools, setSelectedTools] = useState<Set<string>>(
        new Set(tools.map(t => t.id))
    );

    const toggleTool = (toolId: string) => {
        const newSelected = new Set(selectedTools);
        if (newSelected.has(toolId)) {
            newSelected.delete(toolId);
        } else {
            newSelected.add(toolId);
        }
        setSelectedTools(newSelected);
    };

    const getToolIcon = (toolName: string) => {
        if (toolName.includes('create')) return '📝';
        if (toolName.includes('update')) return '✏️';
        if (toolName.includes('search')) return '🔍';
        if (toolName.includes('get')) return '📄';
        return '🔧';
    };

    const getToolPreview = (tool: ToolCall) => {
        if (tool.name === 'create_campaign_note') {
            return `Create note: "${tool.args.title}" with ${tool.args.content?.length || 0} characters`;
        }
        if (tool.name === 'update_campaign_note') {
            return `Update note ID: ${tool.args.note_id} with new title: "${tool.args.title}"`;
        }
        if (tool.name === 'search_campaign_notes') {
            return `Search for: "${tool.args.query_text}"`;
        }
        if (tool.name === 'get_note_by_id') {
            return `Get note ID: ${tool.args.note_id}`;
        }
        return tool.description;
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4">
            <div className="bg-zinc-900 rounded-lg shadow-2xl border border-zinc-700 w-full max-w-2xl max-h-[80vh] flex flex-col">
                
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-zinc-800">
                    <div className="flex items-center gap-2">
                        <Settings className="w-5 h-5 text-amber-400" />
                        <h3 className="text-lg font-medium text-zinc-200">
                            AI Action Approval
                        </h3>
                    </div>
                    <button
                        onClick={onDecline}
                        disabled={isExecuting}
                        className="flex items-center justify-center w-8 h-8 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-md transition-colors disabled:opacity-50"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* AI Message */}
                {aiMessage && (
                    <div className="p-4 border-b border-zinc-800 bg-zinc-950">
                        <div className="text-sm text-zinc-400 mb-2">AI Response:</div>
                        <div className="text-zinc-300 text-sm leading-relaxed">
                            {aiMessage}
                        </div>
                    </div>
                )}

                {/* Tool Selection */}
                <div className="p-4 space-y-3 overflow-y-auto flex-1">
                    <div className="text-sm text-zinc-400 mb-3">
                        The AI wants to perform these actions. Select which ones to approve:
                    </div>
                    
                    {tools.map(tool => (
                        <div key={tool.id} className="group">
                            <label className="flex items-start gap-3 p-3 bg-zinc-800/50 hover:bg-zinc-800 rounded-lg border border-zinc-700 cursor-pointer transition-colors">
                                <input
                                    type="checkbox"
                                    checked={selectedTools.has(tool.id)}
                                    onChange={() => toggleTool(tool.id)}
                                    disabled={isExecuting}
                                    className="mt-1 w-4 h-4 text-amber-600 bg-zinc-700 border-zinc-600 rounded focus:ring-amber-500 focus:ring-2 disabled:opacity-50"
                                />
                                
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-lg">
                                            {getToolIcon(tool.name)}
                                        </span>
                                        <span className="font-medium text-zinc-200">
                                            {tool.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                        </span>
                                    </div>
                                    
                                    <div className="text-sm text-zinc-400 mb-2">
                                        {getToolPreview(tool)}
                                    </div>
                                    
                                    {/* Expandable args details */}
                                    <details className="group">
                                        <summary className="text-xs text-zinc-500 cursor-pointer hover:text-zinc-400">
                                            View parameters...
                                        </summary>
                                        <pre className="text-xs text-zinc-500 mt-2 p-2 bg-zinc-900 rounded border border-zinc-700 overflow-x-auto">
                                            {JSON.stringify(tool.args, null, 2)}
                                        </pre>
                                    </details>
                                </div>
                            </label>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="flex justify-between items-center gap-3 p-4 border-t border-zinc-800">
                    <div className="text-sm text-zinc-400">
                        {selectedTools.size} of {tools.length} actions selected
                    </div>
                    
                    <div className="flex gap-2">
                        <button
                            onClick={onDecline}
                            disabled={isExecuting}
                            className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors disabled:opacity-50"
                        >
                            Decline All
                        </button>
                        
                        <button
                            onClick={() => {
                                const approvedTools = tools.filter(t => selectedTools.has(t.id));
                                onApprove(approvedTools);
                            }}
                            disabled={selectedTools.size === 0 || isExecuting}
                            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-zinc-600 text-white rounded-md transition-colors disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isExecuting ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Executing...
                                </>
                            ) : (
                                <>
                                    <CheckCircle size={16} />
                                    Approve {selectedTools.size > 0 ? `(${selectedTools.size})` : ''}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
```

**⚠️ Potential Issues:**
- **Mobile responsiveness**: Modal might be too wide on small screens
- **Long content**: Very long note content might make UI unwieldy
- **Accessibility**: Make sure keyboard navigation works properly

---

## Phase 5: Enhanced Chat Component

### File: `apps/app/src/components/LLMChatEmbedded.tsx` (modifications)

Add these imports and state:
```typescript
import { ToolApprovalModal } from './ToolApprovalModal';

// Add these state variables to your existing component
const [pendingTools, setPendingTools] = useState<any[]>([]);
const [showToolApproval, setShowToolApproval] = useState(false);
const [isExecutingTools, setIsExecutingTools] = useState(false);
const [agentMode, setAgentMode] = useState(false); // Toggle for agent vs normal chat
```

Replace the existing `handleSubmit` function:
```typescript
const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: LLMMessage = { role: 'human', content: input.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
        const endpoint = agentMode ? '/api/agent/chat' : '/api/llm/chat/stream';
        
        const requestBody = agentMode ? {
            messages: [...messages, userMessage],
            campaign_id: campaign?.id || 'default',
            context: contextString,
            max_iterations: 3
        } : {
            user_id: 'demo-user',
            messages: [...messages, userMessage],
            metadata: {},
            context: contextString,
        };

        const response = await authFetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        if (agentMode) {
            // Handle agent response with potential tool calls
            await handleAgentResponse(response);
        } else {
            // Handle normal streaming response (existing logic)
            await handleNormalStreaming(response);
        }
    } catch (err) {
        console.error(err);
        setMessages(prev => [...prev, { 
            role: 'ai', 
            content: 'Error processing request, please try again.' 
        }]);
    } finally {
        setIsLoading(false);
    }
};

const handleAgentResponse = async (response: Response) => {
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No reader available');

    let buffer = '';
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += new TextDecoder().decode(value);
        
        // Process complete SSE messages
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer
        
        for (const line of lines) {
            if (line.startsWith('data: ')) {
                try {
                    const data = JSON.parse(line.slice(6));
                    
                    if (data.type === 'tool_calls') {
                        // Show tool approval modal
                        setPendingTools(data.tool_calls);
                        setShowToolApproval(true);
                        
                        // Add AI message if present
                        if (data.ai_message) {
                            setMessages(prev => [...prev, {
                                role: 'ai',
                                content: data.ai_message
                            }]);
                        }
                        
                        // Add system message about pending approval
                        const toolList = data.tool_calls
                            .map((tc: any) => `🔧 ${tc.name}: ${tc.description}`)
                            .join('\n');
                            
                        setMessages(prev => [...prev, {
                            role: 'system',
                            content: `⏳ **Waiting for your approval to perform these actions:**\n\n${toolList}\n\n*Please review and approve the actions above.*`
                        }]);
                        
                    } else if (data.type === 'final_response') {
                        setMessages(prev => [...prev, {
                            role: 'ai',
                            content: data.content
                        }]);
                    } else if (data.type === 'error') {
                        setMessages(prev => [...prev, {
                            role: 'ai',
                            content: `❌ Error: ${data.error}`
                        }]);
                    }
                } catch (e) {
                    console.error('Error parsing SSE data:', e);
                }
            }
        }
    }
};

const handleNormalStreaming = async (response: Response) => {
    // Your existing streaming logic here
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No reader available');

    let accumulated = '';
    setMessages(prev => [...prev, { role: 'ai', content: '' }]);

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = new TextDecoder().decode(value);
        accumulated += chunk;
        setMessages(prev => {
            const copy = [...prev];
            copy[copy.length - 1] = { role: 'ai', content: accumulated };
            return copy;
        });
    }
};

const handleToolApproval = async (approvedTools: any[]) => {
    setIsExecutingTools(true);
    
    try {
        const response = await authFetch('/api/agent/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages,
                approved_tool_calls: approvedTools,
                campaign_id: campaign?.id || 'default',
                context: contextString
            })
        });

        if (!response.ok) throw new Error(`Tool execution failed: ${response.status}`);

        // Stream the final response
        await handleToolExecutionStreaming(response);
        
    } catch (error) {
        console.error('Tool execution error:', error);
        setMessages(prev => [...prev, {
            role: 'ai',
            content: `❌ Error executing tools: ${error instanceof Error ? error.message : 'Unknown error'}`
        }]);
    } finally {
        setIsExecutingTools(false);
        setShowToolApproval(false);
        setPendingTools([]);
    }
};

const handleToolExecutionStreaming = async (response: Response) => {
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No reader available');

    let accumulated = '';
    setMessages(prev => [...prev, { role: 'ai', content: '' }]);

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = new TextDecoder().decode(value);
        if (chunk.startsWith('data: ')) {
            const content = chunk.slice(6);
            accumulated += content;
            
            setMessages(prev => {
                const copy = [...prev];
                copy[copy.length - 1] = { role: 'ai', content: accumulated };
                return copy;
            });
        }
    }
};

const handleToolDecline = () => {
    setShowToolApproval(false);
    setPendingTools([]);
    setMessages(prev => [...prev, {
        role: 'ai',
        content: '✋ Tool execution declined. How else can I help you?'
    }]);
};
```

Add agent mode toggle to the header:
```typescript
{/* Add this to the header section, after the template button */}
<button 
    onClick={() => setAgentMode(!agentMode)}
    className={`flex items-center justify-center w-7 h-7 rounded-md transition-colors ${
        agentMode 
            ? 'text-green-400 bg-green-900/20' 
            : 'text-zinc-400 hover:text-green-400 hover:bg-green-900/20'
    }`}
    title={`Agent Mode: ${agentMode ? 'ON' : 'OFF'}`}
>
    🤖
</button>
```

Add the tool approval modal at the end of your return statement:
```typescript
{/* Tool Approval Modal */}
{showToolApproval && (
    <ToolApprovalModal
        tools={pendingTools}
        onApprove={handleToolApproval}
        onDecline={handleToolDecline}
        isExecuting={isExecutingTools}
    />
)}
```

**⚠️ Potential Issues:**
- **State management**: Lots of state variables - consider using useReducer for complex state
- **Error boundaries**: Tool execution errors could crash the component
- **Memory leaks**: Make sure to clean up streaming connections properly
- **Race conditions**: User could send new message while tools are executing

---

## Phase 6: Testing Strategy

### Test Cases to Implement:

1. **Basic Tool Calling**
   ```typescript
   // Test: Create a simple note
   // User input: "Create a note called 'Test Note' with content 'Hello World'"
   // Expected: Tool approval modal appears with create_campaign_note
   ```

2. **Tool Approval Workflow**
   ```typescript
   // Test: Approve some tools, decline others
   // Test: Cancel tool approval completely
   // Test: Handle tool execution errors gracefully
   ```

3. **Search and Update Flow**
   ```typescript
   // Test: "Find notes about dragons and update the first one"
   // Expected: Search tool + update tool in sequence
   ```

4. **Error Handling**
   ```typescript
   // Test: Invalid note IDs
   // Test: Permission errors (wrong campaign)
   // Test: Network failures during tool execution
   ```

### Implementation Order:
1. ✅ **Start with note tools** - these are straightforward CRUD operations
2. ✅ **Add LLM service enhancements** - tool calling logic
3. ✅ **Create agent endpoints** - API layer
4. ✅ **Build tool approval modal** - user interface
5. ✅ **Integrate with chat component** - wire everything together  
6. ✅ **Test extensively** - all the edge cases

### Key Learning Points:
- **LangChain tool binding** - How `bind_tools()` works with different providers
- **Streaming protocols** - Server-sent events with structured data
- **State management** - Complex async workflows in React
- **Error handling** - Graceful degradation when things go wrong
- **Security** - User context binding and permission checking

This should give you everything you need to implement a robust tool-calling agent system! The approval workflow ensures users stay in control while getting the benefits of agentic behavior.