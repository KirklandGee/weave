from backend.services.agents.models import AssistantDependencies
from backend.services.embeddings.vector_search import get_vector_search_service

from pydantic_ai import RunContext
from pydantic_ai.toolsets import FunctionToolset

# Create the toolset first so we can use decorator
assistant_tools = FunctionToolset()

@assistant_tools.tool
def search_notes(
    ctx: RunContext[AssistantDependencies],
    query: str,
    limit: int = 5,
    threshold: float = 0.7,
) -> str:
    """Search for notes and content in the current campaign."""
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
        formatted.append(f"**{result.title}** ({result.type})")
        formatted.append(f"{result.markdown[:200]}...")
        formatted.append("")
    
    return f"Found {len(results)} results:\n\n" + "\n".join(formatted)