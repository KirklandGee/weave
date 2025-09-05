#!/usr/bin/env python3
"""
Quick test for the new agent endpoint
"""
import sys
import os
import asyncio
import json

# Add both current directory and parent directory to path
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(current_dir)  # backend directory
root_dir = os.path.dirname(backend_dir)     # ai_rpg_manager directory

sys.path.insert(0, backend_dir)  # So we can import services.* directly
sys.path.insert(0, root_dir)     # So we can import backend.*

from backend.models.schemas import ChatRequest, LLMMessage
from backend.api.routers.agents import agent_stream_generator

async def test_agent_endpoint():
    """Test the agent endpoint with a simple request"""
    
    # Create a simple chat request
    messages = [
        LLMMessage(role="human", content="Hello, can you help me find information about dragons in my campaign?")
    ]
    
    req = ChatRequest(
        user_id="test_user",
        messages=messages,
        context="Test campaign context with some dragon lore",
        campaign_id="test_campaign"
    )
    
    print("=== Testing Agent Endpoint ===")
    print(f"Request: {req.messages[-1].content}")
    print(f"Campaign ID: {req.campaign_id}")
    print(f"Context: {req.context}")
    print()
    
    print("=== Streaming Response ===")
    
    try:
        async for chunk in agent_stream_generator(req, "test_user"):
            # Parse the JSON chunk
            try:
                data = json.loads(chunk.strip())
                event_type = data.get("type", "unknown")
                content = data.get("content", "")
                
                if event_type == "tool_call":
                    print(f"🔧 {content}")
                elif event_type == "tool_result":
                    print(f"✅ {content}")
                elif event_type == "text":
                    print(f"📝 Text chunk: {content}")
                elif event_type == "suggested_actions":
                    print(f"💡 Suggested actions: {len(content)} actions")
                    for i, action in enumerate(content, 1):
                        print(f"\n   Action {i}:")
                        print(f"     Type: {action.get('type')}")
                        print(f"     Target ID: {action.get('target_id', 'None')}")
                        print(f"     Title: {action.get('title', 'None')}")
                        print(f"     Content: {action.get('content', '')}")
                        print(f"     Reasoning: {action.get('reasoning', '')}")
                        print()
                elif event_type == "error":
                    print(f"❌ Error: {content}")
                else:
                    print(f"❓ Unknown event type: {event_type}")
                    
            except json.JSONDecodeError as e:
                print(f"⚠️ Failed to parse JSON: {e}")
                print(f"Raw chunk: {chunk}")
                
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_agent_endpoint())