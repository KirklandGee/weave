import sys
import os
import asyncio

# Add both current directory and parent directory to path
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(current_dir)  # backend directory
root_dir = os.path.dirname(backend_dir)     # ai_rpg_manager directory

sys.path.insert(0, backend_dir)  # So we can import services.* directly
sys.path.insert(0, root_dir)     # So we can import backend.*

try:
    from backend.services.agents.chat_agent import create_assistant
    from backend.services.agents.models import AssistantDependencies
except ImportError:
    # Fallback to direct import
    from services.agents.chat_agent import create_assistant

async def test_agent():
    agent = create_assistant(
        model="openai:gpt-5"  # Try GPT-5
    )
    
    deps = AssistantDependencies( 
        campaign_id=os.getenv("TEST_CAMPAIGN_ID", "test_campaign"),
        user_id=os.getenv("TEST_USER_ID", "test_user"),
    )

    print("=== Streaming Agent Response with Tool Events ===")
    
    # Track tool calls through events
    tool_events = []
    
    async def event_handler(ctx, event_stream):
        from pydantic_ai.messages import FunctionToolCallEvent, FunctionToolResultEvent
        async for event in event_stream:
            if isinstance(event, FunctionToolCallEvent):
                tool_events.append(f"🔧 Calling {event.part.tool_name}({event.part.args})")
                print(f"🔧 Tool Call: {event.part.tool_name}({event.part.args})")
            elif isinstance(event, FunctionToolResultEvent):
                tool_events.append(f"✅ Tool {event.tool_call_id} returned: {str(event.result.content)[:100]}...")
                print(f"✅ Tool Result: {str(event.result.content)[:100]}...")
    
    # Test streaming with event tracking
    async with agent.run_stream(
        "Hello, can you help me find information about dragons in my campaign?",
        deps=deps,
        event_stream_handler=event_handler
    ) as result:
        print("Streaming structured output...")
        final_output = None
        async for partial_output in result.stream_output():
            print(f"Partial: {partial_output}")
            final_output = partial_output
        
        print(f"\nFinal Message: {final_output.message}")
        print(f"Suggested Actions: {len(final_output.suggested_actions)}")
        for i, action in enumerate(final_output.suggested_actions):
            print(f"  {i+1}. {action.type}: {action.reasoning}")
        
        print(f"\nTool Events Captured: {len(tool_events)}")
        for event in tool_events:
            print(f"  {event}")

    print("\n=== Suggested Actions Test ===")
    # Test the suggested actions functionality
    tool_events.clear()  # Reset for new test
    
    async with agent.run_stream(
        "Can you find any barbarian NPCs named Jeff in my campaign? If there aren't any, I'd like you to suggest creating one with a backstory.",
        deps=deps,
        event_stream_handler=event_handler
    ) as result:
        print("Streaming suggested actions test...")
        final_output = None
        async for partial_output in result.stream_output():
            # Only print every few partials to reduce noise
            if len(partial_output.message) % 50 == 0 or partial_output.suggested_actions:
                print(f"Partial (len={len(partial_output.message)}): {len(partial_output.suggested_actions)} actions")
            final_output = partial_output
        
        print(f"\n🎯 Final Response:")
        print(f"Message: {final_output.message[:200]}{'...' if len(final_output.message) > 200 else ''}")
        
        print(f"\n📝 Suggested Actions ({len(final_output.suggested_actions)}):")
        for i, action in enumerate(final_output.suggested_actions, 1):
            print(f"  {i}. Type: {action.type}")
            print(f"     Title: {action.title or 'N/A'}")
            print(f"     Target: {action.target_id or 'N/A'}")
            print(f"     Content: {action.content[:100]}{'...' if len(action.content) > 100 else ''}")
            print(f"     Reasoning: {action.reasoning}")
            print()
        
        print(f"🔧 Tool Events in This Test: {len(tool_events)}")
        for event in tool_events:
            print(f"  {event}")

if __name__ == "__main__":
    asyncio.run(test_agent())