# Agno + Neo4j Vector Search Integration Guide

## Overview

This guide covers integrating Agno agents with your existing Neo4j vector search system using a tool-based approach. Instead of implementing a full VectorDB interface, we'll expose your existing search methods as Agno tools for targeted campaign context retrieval.

## Architecture Decision: Tools vs VectorDB

**Why Tools Are Perfect for This Use Case:**
- Your existing `VectorSearchService` already provides sophisticated domain-specific search
- Whole-note embeddings don't require chunking/RAG complexity  
- User/campaign scoping is already implemented
- Much faster development time (~100 lines vs 500+)
- Agent can selectively choose what context it needs

**Trade-offs:**
- Manual context retrieval (agent decides when to search) vs automatic injection
- Slight performance overhead from LLM reasoning about when to use tools
- Marginal cost increase from additional tool calls

## Agno Framework Fundamentals

### Agent Architecture
```python
from agno import Agent

# Basic agent structure
agent = Agent(
    name="RPG Campaign Assistant",
    role="D&D campaign management and storytelling assistant",
    tools=[...],  # Your custom tools go here
    # Other configuration...
)
```

### Tool System
Agno uses function-based tools with decorators:

```python
from agno import tool
from typing import List, Optional

@tool
def search_campaign_notes(query: str, campaign_id: str, limit: int = 5) -> str:
    """Search for relevant notes in a specific campaign."""
    # Your implementation here
    pass
```

## Implementation Plan

### 1. Tool Creation (`backend/services/agents/campaign_tools.py`)

Create wrapper functions around your existing `VectorSearchService` methods:

#### Core Search Tools

```python
from typing import List, Optional
from agno import tool
from backend.services.embeddings.vector_search import get_vector_search_service
from backend.models.schemas import VectorSearchResult

# Initialize your service
vector_service = get_vector_search_service()

@tool
def search_campaign_context(
    query: str, 
    user_id: str, 
    campaign_id: str, 
    limit: int = 5
) -> str:
    """
    Search across all campaign entities (notes, characters, locations, NPCs) 
    for context relevant to the query.
    
    Args:
        query: Natural language search query
        user_id: User ID for access control
        campaign_id: Campaign ID to scope search
        limit: Maximum number of results
    
    Returns:
        Formatted string with relevant campaign context
    """
    results = vector_service.search_nodes(
        query_text=query,
        user_id=user_id, 
        campaign_id=campaign_id,
        limit=limit,
        threshold=0.7
    )
    
    return format_search_results(results, "Campaign Context")

@tool  
def find_relevant_notes(
    query: str,
    user_id: str,
    campaign_id: str,
    limit: int = 5
) -> str:
    """
    Find campaign notes most relevant to the query.
    
    Perfect for retrieving session notes, plot points, or world-building details.
    """
    # Generate embedding for query
    embedding = vector_service.embedding_service.generate_embedding(query)
    if not embedding:
        return "No embedding could be generated for the query."
        
    results = vector_service._search_notes(
        embedding=embedding,
        user_id=user_id,
        campaign_id=campaign_id, 
        limit=limit,
        threshold=0.7
    )
    
    return format_search_results(results, "Relevant Notes")

@tool
def find_relevant_characters(
    query: str,
    user_id: str,
    campaign_id: str, 
    limit: int = 3
) -> str:
    """
    Find characters (PCs/NPCs) relevant to the query.
    
    Useful for character interactions, relationship queries, or story continuity.
    """
    embedding = vector_service.embedding_service.generate_embedding(query)
    if not embedding:
        return "No embedding could be generated for the query."
        
    results = vector_service._search_characters(
        embedding=embedding,
        user_id=user_id,
        campaign_id=campaign_id,
        limit=limit,
        threshold=0.7
    )
    
    return format_search_results(results, "Relevant Characters")

@tool
def find_relevant_locations(
    query: str,
    user_id: str,
    campaign_id: str,
    limit: int = 3  
) -> str:
    """
    Find locations relevant to the query.
    
    Useful for setting scenes, travel planning, or world-building context.
    """
    embedding = vector_service.embedding_service.generate_embedding(query)
    if not embedding:
        return "No embedding could be generated for the query."
        
    results = vector_service._search_locations(
        embedding=embedding,
        user_id=user_id,
        campaign_id=campaign_id,
        limit=limit,
        threshold=0.7
    )
    
    return format_search_results(results, "Relevant Locations")

def format_search_results(results: List[VectorSearchResult], category: str) -> str:
    """
    Format search results into readable context for the LLM.
    """
    if not results:
        return f"No relevant {category.lower()} found."
        
    formatted = f"## {category}\n\n"
    
    for result in results:
        formatted += f"**{result.title}** (Type: {result.type}, Similarity: {result.similarity_score:.2f})\n"
        if result.markdown:
            # Truncate if too long to avoid context window issues
            content = result.markdown[:500] + "..." if len(result.markdown) > 500 else result.markdown
            formatted += f"{content}\n\n"
        formatted += "---\n\n"
    
    return formatted
```

#### Specialized Tools

```python
@tool
def find_similar_content(
    node_id: str,
    user_id: str, 
    campaign_id: str,
    limit: int = 3
) -> str:
    """
    Find content similar to a specific node (character, location, etc.).
    
    Useful for finding related plot threads, similar NPCs, or connected locations.
    """
    results = vector_service.find_similar_to_node(
        node_id=node_id,
        user_id=user_id,
        campaign_id=campaign_id,
        limit=limit,
        threshold=0.7
    )
    
    return format_search_results(results, "Similar Content")

@tool
def search_by_entity_type(
    query: str,
    entity_type: str,
    user_id: str,
    campaign_id: str,
    limit: int = 3
) -> str:
    """
    Search for specific entity types: 'characters', 'locations', 'notes', 'npcs', 'sessions'.
    
    Allows targeted searches when you know what type of information you need.
    """
    embedding = vector_service.embedding_service.generate_embedding(query)
    if not embedding:
        return "No embedding could be generated for the query."
    
    search_functions = {
        'characters': vector_service._search_characters,
        'locations': vector_service._search_locations, 
        'notes': vector_service._search_notes,
        'npcs': vector_service._search_npcs,
        'sessions': vector_service._search_sessions,
    }
    
    if entity_type not in search_functions:
        return f"Invalid entity type. Choose from: {', '.join(search_functions.keys())}"
    
    results = search_functions[entity_type](
        embedding=embedding,
        user_id=user_id,
        campaign_id=campaign_id,
        limit=limit,
        threshold=0.7
    )
    
    return format_search_results(results, f"Relevant {entity_type.title()}")
```

### 2. Agent Configuration (`backend/services/agents/rpg_agent.py`)

```python
from agno import Agent
from .campaign_tools import (
    search_campaign_context,
    find_relevant_notes,
    find_relevant_characters,
    find_relevant_locations,
    find_similar_content,
    search_by_entity_type
)

def create_rpg_campaign_agent(user_id: str, campaign_id: str) -> Agent:
    """
    Create an Agno agent configured for RPG campaign assistance.
    
    Args:
        user_id: User ID for access control
        campaign_id: Campaign ID for scoping searches
    """
    
    # Pre-bind user context to tools
    def bind_context(tool_func):
        """Helper to bind user_id and campaign_id to tool functions"""
        def wrapper(*args, **kwargs):
            return tool_func(*args, user_id=user_id, campaign_id=campaign_id, **kwargs)
        wrapper.__name__ = tool_func.__name__
        wrapper.__doc__ = tool_func.__doc__
        return wrapper
    
    # Create context-bound tools
    bound_tools = [
        bind_context(search_campaign_context),
        bind_context(find_relevant_notes),
        bind_context(find_relevant_characters), 
        bind_context(find_relevant_locations),
        bind_context(find_similar_content),
        bind_context(search_by_entity_type)
    ]
    
    agent = Agent(
        name="RPG Campaign Assistant",
        role=f"""You are an expert D&D campaign assistant with access to all campaign data.
        
        Your capabilities include:
        - Searching campaign notes and session summaries
        - Finding information about characters (PCs and NPCs)  
        - Retrieving location details and world-building
        - Discovering relationships between campaign elements
        
        Always search for relevant context before answering questions about the campaign.
        Use multiple search tools when needed to gather comprehensive information.
        Format responses in a helpful, narrative style appropriate for D&D.
        """,
        
        tools=bound_tools,
        
        # Model configuration
        model="claude-sonnet-3.5",  # or your preferred model
        
        # Conversation settings
        show_tool_calls=True,
        markdown=True,
        
        # Performance tuning
        max_tool_calls=5,  # Prevent infinite tool calling
        
        # Instructions for tool usage
        instructions=[
            "Always search for relevant campaign context before answering questions",
            "Use specific search tools when you know the entity type you need",
            "Combine multiple searches to build comprehensive answers", 
            "Format responses as engaging D&D narrative when appropriate"
        ]
    )
    
    return agent
```

### 3. API Integration (`backend/services/agents/api.py`)

```python
from fastapi import HTTPException
from .rpg_agent import create_rpg_campaign_agent

async def chat_with_campaign_agent(
    message: str,
    user_id: str,
    campaign_id: str,
    conversation_history: Optional[List[dict]] = None
) -> str:
    """
    Chat with the campaign agent, with automatic context retrieval.
    """
    try:
        # Create agent with user/campaign context
        agent = create_rpg_campaign_agent(user_id, campaign_id)
        
        # Add conversation history if provided
        if conversation_history:
            for msg in conversation_history:
                agent.add_message(msg)
        
        # Get response
        response = agent.run(message)
        
        return response.content
        
    except Exception as e:
        raise HTTPException(status_code=500, f"Agent error: {str(e)}")
```

## Configuration Examples

### Basic Agent Usage

```python
# Create agent
agent = create_rpg_campaign_agent(
    user_id="user_123", 
    campaign_id="campaign_456"
)

# Ask questions - agent will automatically search for context
response = agent.run("Tell me about the last session and what the party accomplished")

# Agent will internally:
# 1. Call find_relevant_notes("last session party accomplished") 
# 2. Get context from recent session notes
# 3. Provide comprehensive answer based on retrieved context
```

### Advanced Usage with Explicit Tool Calls

```python
# For more control, you can suggest specific searches
response = agent.run("""
Before answering, please:
1. Search for notes about recent combat encounters
2. Find information about the current villain
3. Look up details about our current location

Then tell me what challenges the party might face next session.
""")
```

## Error Handling & Validation

### Tool-Level Error Handling

```python
@tool
def safe_search_campaign_context(query: str, user_id: str, campaign_id: str, limit: int = 5) -> str:
    """Error-handled version of campaign context search."""
    try:
        if not query.strip():
            return "Empty query provided."
            
        if limit < 1 or limit > 20:
            limit = 5  # Sensible default
            
        results = vector_service.search_nodes(
            query_text=query,
            user_id=user_id,
            campaign_id=campaign_id, 
            limit=limit,
            threshold=0.7
        )
        
        if not results:
            return "No relevant campaign context found for this query."
            
        return format_search_results(results, "Campaign Context")
        
    except Exception as e:
        return f"Error searching campaign context: {str(e)}"
```

### Access Control Validation

```python
def validate_access(user_id: str, campaign_id: str) -> bool:
    """
    Validate that user has access to the campaign.
    Integrate with your existing auth system.
    """
    # Your existing access control logic
    # Return True if user can access campaign
    pass

@tool
def protected_search_notes(query: str, user_id: str, campaign_id: str, limit: int = 5) -> str:
    """Note search with access control."""
    if not validate_access(user_id, campaign_id):
        return "Access denied: You don't have permission to access this campaign."
        
    # Continue with search...
```

## Performance Considerations

### Context Window Management

```python
def format_search_results(results: List[VectorSearchResult], category: str, max_content_length: int = 300) -> str:
    """
    Format results with content length limits to manage context window.
    """
    if not results:
        return f"No relevant {category.lower()} found."
        
    formatted = f"## {category}\n\n"
    
    for result in results:
        formatted += f"**{result.title}** (Similarity: {result.similarity_score:.2f})\n"
        
        if result.markdown:
            # Intelligently truncate content
            content = result.markdown
            if len(content) > max_content_length:
                # Try to cut at sentence boundary
                truncated = content[:max_content_length]
                last_period = truncated.rfind('.')
                if last_period > max_content_length * 0.8:  # If period is reasonably close to end
                    content = truncated[:last_period + 1] + " [...]"
                else:
                    content = truncated + "..."
            
            formatted += f"{content}\n\n"
            
        formatted += "---\n\n"
    
    return formatted
```

### Cost Optimization

```python
# Batch related searches to reduce tool calls
@tool
def comprehensive_campaign_search(
    query: str,
    user_id: str, 
    campaign_id: str,
    include_notes: bool = True,
    include_characters: bool = True,
    include_locations: bool = False,
    limit_per_type: int = 3
) -> str:
    """
    Perform multiple searches in one tool call to reduce LLM overhead.
    """
    embedding = vector_service.embedding_service.generate_embedding(query)
    if not embedding:
        return "No embedding could be generated for the query."
    
    all_results = []
    
    if include_notes:
        notes = vector_service._search_notes(embedding, user_id, campaign_id, limit_per_type, 0.7)
        all_results.extend([("Note", r) for r in notes])
        
    if include_characters: 
        characters = vector_service._search_characters(embedding, user_id, campaign_id, limit_per_type, 0.7)
        all_results.extend([("Character", r) for r in characters])
        
    if include_locations:
        locations = vector_service._search_locations(embedding, user_id, campaign_id, limit_per_type, 0.7)
        all_results.extend([("Location", r) for r in locations])
    
    # Format combined results
    if not all_results:
        return "No relevant campaign information found."
        
    formatted = "## Campaign Context\n\n"
    
    # Sort by similarity across all types
    all_results.sort(key=lambda x: x[1].similarity_score, reverse=True)
    
    for category, result in all_results:
        formatted += f"**{result.title}** ({category}, Similarity: {result.similarity_score:.2f})\n"
        if result.markdown:
            content = result.markdown[:200] + "..." if len(result.markdown) > 200 else result.markdown
            formatted += f"{content}\n\n"
        formatted += "---\n\n"
    
    return formatted
```

## Testing & Deployment

### Unit Tests

```python
import pytest
from unittest.mock import Mock, patch
from backend.services.agents.campaign_tools import find_relevant_notes

@pytest.fixture
def mock_vector_service():
    with patch('backend.services.agents.campaign_tools.vector_service') as mock:
        yield mock

def test_find_relevant_notes_success(mock_vector_service):
    # Mock embedding service
    mock_vector_service.embedding_service.generate_embedding.return_value = [0.1, 0.2, 0.3]
    
    # Mock search results
    mock_result = Mock()
    mock_result.title = "Test Note"
    mock_result.type = "note"
    mock_result.similarity_score = 0.85
    mock_result.markdown = "This is a test note content."
    
    mock_vector_service._search_notes.return_value = [mock_result]
    
    # Test the tool
    result = find_relevant_notes("test query", "user_123", "campaign_456")
    
    assert "Test Note" in result
    assert "0.85" in result
    assert "This is a test note content." in result

def test_find_relevant_notes_no_embedding(mock_vector_service):
    mock_vector_service.embedding_service.generate_embedding.return_value = None
    
    result = find_relevant_notes("test query", "user_123", "campaign_456")
    
    assert "No embedding could be generated" in result
```

### Integration Testing

```python
def test_agent_with_real_search():
    """Test agent with actual vector search (requires test database)."""
    agent = create_rpg_campaign_agent("test_user", "test_campaign")
    
    # Test basic functionality
    response = agent.run("What characters are in this campaign?")
    
    # Should include tool calls in the response
    assert response.content is not None
    # Check that tools were called (if show_tool_calls=True)
```

### Load Testing

```python
import asyncio
import time

async def test_agent_performance():
    """Test agent response times under load."""
    agent = create_rpg_campaign_agent("test_user", "test_campaign")
    
    queries = [
        "Tell me about the last session",
        "Who is the main villain?", 
        "Where is the party currently?",
        "What items do the characters have?",
        "What happened in the tavern?"
    ]
    
    start_time = time.time()
    tasks = [agent.run(query) for query in queries]
    responses = await asyncio.gather(*tasks)
    end_time = time.time()
    
    print(f"5 queries completed in {end_time - start_time:.2f} seconds")
    print(f"Average response time: {(end_time - start_time) / 5:.2f} seconds")
```

## Alternative Approaches

### When to Use Full VectorDB Integration

Consider implementing the full `VectorDb` interface if:

1. **Automatic Context Injection**: You want every query to automatically get relevant context without explicit tool calls
2. **Document Chunking**: You need to split large documents and retrieve specific chunks
3. **Advanced RAG Features**: You need reranking, hybrid search, or complex retrieval strategies
4. **Performance Critical**: You have high-volume usage where tool call overhead matters
5. **Multi-Agent Systems**: Multiple agents need to share the same knowledge base

### Hybrid Approach

You could combine both approaches:

```python
# Use VectorDB for automatic context + tools for specific searches
agent = Agent(
    name="Hybrid RPG Agent",
    knowledge_base=Neo4jVectorDb(...),  # Automatic context injection
    tools=[
        find_specific_character,  # Targeted searches
        get_combat_stats,
        lookup_spell_details
    ]
)
```

### Migration Path

Start with tools (faster development) and migrate to full VectorDB later:

1. **Phase 1**: Implement tool-based approach (this guide)
2. **Phase 2**: Add automatic context injection for common queries  
3. **Phase 3**: Full VectorDB implementation if needed for performance

## Conclusion

The tool-based approach provides an excellent balance of:
- **Fast Implementation**: Leverage your existing, tested vector search
- **Flexibility**: Agent chooses what context it needs  
- **Domain Awareness**: RPG-specific search methods (characters, locations, etc.)
- **Maintainability**: No complex VectorDB interface to maintain

Your existing `VectorSearchService` is already sophisticated and well-suited for this use case. The tool wrapper approach will get you up and running quickly while preserving all your existing functionality.

## Next Steps

1. **Implement Core Tools**: Start with `search_campaign_context` and `find_relevant_notes`
2. **Test Basic Agent**: Create simple agent and test with sample queries
3. **Add Specialized Tools**: Implement character/location specific searches
4. **Performance Tuning**: Optimize context window usage and error handling
5. **Production Integration**: Add authentication, logging, and monitoring

## Resources

- [Agno Documentation](https://docs.agno.com)
- [Agno GitHub Repository](https://github.com/agno-agi/agno)
- [Vector Search Best Practices](https://docs.agno.com/vectordb)
- Your existing `backend/services/embeddings/vector_search.py` - Reference implementation