from backend.services.agents.models import AssistantDependencies
from backend.services.embeddings.vector_search import get_vector_search_service
from backend.services.neo4j import query

from pydantic_ai import RunContext
from pydantic_ai.toolsets import FunctionToolset

# Create the toolset first so we can use decorator
assistant_tools = FunctionToolset()

@assistant_tools.tool
def find_notes_by_title(
    ctx: RunContext[AssistantDependencies],
    title_query: str,
    limit: int = 10,
) -> str:
    """Find notes by title/name. Use this first when you know or roughly know the title of a note you want to update or append to."""    
    # Case-insensitive title search with CONTAINS
    results = query(
        cypher = """
        MATCH (n:Note)
        WHERE n.campaignId = $campaign_id 
        AND n.ownerId = $user_id
        AND toLower(n.title) CONTAINS toLower($title_query)
        RETURN n.id as id, n.title as title, n.type as type, 
               substring(n.markdown, 0, 150) + '...' as preview
        ORDER BY n.title
        LIMIT $limit
        """,
        campaign_id=ctx.deps.campaign_id,
        user_id=ctx.deps.user_id,
        title_query=title_query,
        limit=limit
    )
        
        
        
        
    
    if not results:
        return f"No notes found with title containing '{title_query}'"
    
    formatted = []
    for record in results:
        formatted.append(f"ID: {result['id']}")
        formatted.append(f"Title: **{result['title']}** ({result['type']})")
        formatted.append(f"Preview: {result['preview']}")
        formatted.append("")
    
    return f"Found {len(results)} notes by title:\n\n" + "\n".join(formatted)

@assistant_tools.tool
def search_notes_vector(
    ctx: RunContext[AssistantDependencies],
    query: str,
    limit: int = 5,
    threshold: float = 0.7,
) -> str:
    """Search for notes and content using semantic/vector search. Use find_notes_by_title first if you know the note title."""
    results = ctx.deps.search_service.search_nodes(
        query_text=query,
        user_id=ctx.deps.user_id,
        campaign_id=ctx.deps.campaign_id,
        limit=limit,
        threshold=threshold,
    )

    if not results:
        return f"No relevant notes found for '{query}'"
    
    formatted = []
    for result in results:
        formatted.append(f"ID: {result.id}")
        formatted.append(f"Title: **{result.title}** ({result.type})")
        formatted.append(f"Content: {result.markdown[:200]}...")
        formatted.append("")
    
    return f"Found {len(results)} results:\n\n" + "\n".join(formatted)