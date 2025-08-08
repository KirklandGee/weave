import nanoid
import time
from datetime import datetime
from langchain_core.tools import tool
from backend.services.neo4j import query
from backend.services.neo4j.queries import build_create_query
from backend.services.embeddings.vector_search import get_vector_search_service
from backend.models.schemas import VectorSearchResult
from backend.models.notes import Note
from backend.models.components import Metadata, MarkdownContent

vector_service = get_vector_search_service()

# Pure functions without decorators
def _search_campaign_context(query: str, user_id: str, campaign_id: str, limit: int = 5) -> str:
    """Core search logic."""
    try:
        results = vector_service.search_nodes(
            query_text=query,
            user_id=user_id, 
            campaign_id=campaign_id,
            limit=limit,
            threshold=0.7
        )

        if not results:
            return f"No relevant campaign context found for query: {query}"
        
        formatted = "## Relevant Notes\n\n"
        for result in results:
            formatted += f"**{result.title}** (Type: {result.type}, Similarity: {result.similarity_score:.2f})\n"
            content = result.markdown
            formatted += f"{content}\n\n"

        return formatted
    except Exception as e:
        return f"Error searching campaign context: {str(e)}"

def _create_campaign_note(title: str, content: str, user_id: str, campaign_id: str, note_type: str) -> str:
    """Core note creation logic."""
    try:
        # Generate unique note ID with timestamp to avoid collisions
        timestamp = int(time.time() * 1000)  # milliseconds
        nanoid_part = nanoid.generate(size=10)
        note_id = f"{campaign_id}-{note_type}-{nanoid_part}-{timestamp}"
        
        print(f"🔍 Generated nanoid: {nanoid_part}, timestamp: {timestamp}")
        print(f"🔍 Creating note with: campaign_id={campaign_id}, user_id={user_id}, note_id={note_id}")
        
        # First check if campaign exists and is owned by user
        print(f"🔍 Running query with user_id='{user_id}', campaign_id='{campaign_id}'")
        check_result = query("""
            MATCH (u:User {id: $user_id})-[:OWNS]->(c:Campaign {id: $campaign_id})
            RETURN c.id as campaign_id, u.id as user_id
        """, campaign_id=campaign_id, user_id=user_id)
        
        # Also check what relationships actually exist
        rel_check = query("""
            MATCH (u:User {id: $user_id})-[r]-(c:Campaign {id: $campaign_id})
            RETURN type(r) as relationship_type, startNode(r).id as start_id, endNode(r).id as end_id
        """, campaign_id=campaign_id, user_id=user_id)
        print(f"🔍 Existing relationships: {rel_check}")
        
        print(f"🔍 Campaign ownership check result: {check_result}")
        
        if not check_result:
            # Check if campaign exists at all
            campaign_exists = query("""
                MATCH (c:Campaign {id: $campaign_id})
                RETURN c.id as campaign_id
            """, campaign_id=campaign_id)
            
            print(f"🔍 Campaign existence check: {campaign_exists}")
            
            # Check if user exists
            user_exists = query("""
                MATCH (u:User {id: $user_id})
                RETURN u.id as user_id
            """, user_id=user_id)
            
            print(f"🔍 User existence check: {user_exists}")
            
            if not campaign_exists:
                return f"❌ Campaign {campaign_id} does not exist"
            elif not user_exists:
                return f"❌ User {user_id} does not exist"
            else:
                return f"❌ User {user_id} does not own campaign {campaign_id}"

        # Create Note instance using the proper model structure
        now = datetime.now()
        metadata = Metadata(
            id=note_id,
            created_at=now,
            updated_at=now
        )
        markdown_content = MarkdownContent(
            title=title,
            markdown=content
        )
        note = Note(
            metadata=metadata,
            content=markdown_content,
            type=note_type
        )
        
        # Use build_create_query to generate the query and parameters
        create_query, create_params = build_create_query(note)
        
        # Execute the note creation with relationship to campaign
        # build_create_query returns "CREATE (n:Note $props) RETURN n"
        # We need to modify it to not return immediately so we can add the relationship
        create_query_modified = create_query.replace(" RETURN n", "")
        
        result = query(f"""
            MATCH (u:User {{id: $user_id}})-[:OWNS]->(c:Campaign {{id: $campaign_id}})
            {create_query_modified}
            MERGE (n)-[:PART_OF]->(c)
            RETURN n.id as id, n.title as title
        """, 
        user_id=user_id,
        campaign_id=campaign_id,
        **create_params)
        
        print(f"🔍 Note creation result: {result}")
        
        if result:
            return f"✅ Created note '{result[0]['title']}' with ID: {result[0]['id']}"
        else:
            return "❌ Failed to create note - unexpected error"
    except Exception as e:
        print(f"🔍 Exception creating note: {str(e)}")
        return f"❌ Error creating note: {str(e)}"

def _update_campaign_note(note_id: str, title: str, content: str, user_id: str, campaign_id: str) -> str:
    """Core note update logic."""
    try:
        result = query("""
            MATCH (n:Note {id: $note_id})-[:PART_OF]->(c:Campaign {id: $campaign_id})<-[:OWNS]-(u:User {id: $user_id})
            SET n.title = $title, n.markdown = $content, n.updated_at = datetime()
            RETURN n.title as title, n.id as id
        """, 
        note_id=note_id, 
        title=title, 
        content=content, 
        user_id=user_id, 
        campaign_id=campaign_id)
        
        if result:
            return f"✅ Updated note '{result[0]['title']}' (ID: {result[0]['id']})"
        else:
            return f"❌ Note {note_id} not found or no permission to update"
    except Exception as e:
        return f"❌ Error updating note: {str(e)}"

# Tool wrappers for direct use
@tool
def search_campaign_context(query: str, user_id: str, campaign_id: str, limit: int = 5) -> str:
    """Search across all campaign entities for context relevant to the query."""
    return _search_campaign_context(query, user_id, campaign_id, limit)

@tool
def create_campaign_note(title: str, content: str, user_id: str, campaign_id: str, note_type: str) -> str:
    """Create a new note in the campaign.""" 
    return _create_campaign_note(title, content, user_id, campaign_id, note_type)

@tool
def update_campaign_note(note_id: str, title: str, content: str, user_id: str, campaign_id: str) -> str:
    """Update an existing note's title and content."""
    return _update_campaign_note(note_id, title, content, user_id, campaign_id)

# Tool registry function
def get_campaign_tools(user_id: str, campaign_id: str):
    """Get tools bound with user and campaign context."""
    from pydantic import BaseModel, Field
    from langchain_core.tools import tool
    
    # Create new Pydantic models with reduced parameters (removing user_id and campaign_id)
    
    class SearchInput(BaseModel):
        query: str = Field(description="Natural language search query")
        limit: int = Field(default=5, description="Maximum number of results")
    
    class CreateNoteInput(BaseModel):
        title: str = Field(description="Title of the note")
        content: str = Field(description="Content of the note in markdown format")
        note_type: str = Field(description="Type of note: character, location, npc, plot, item, lore, session")
    
    class UpdateNoteInput(BaseModel):
        note_id: str = Field(description="ID of the note to update")
        title: str = Field(description="Updated title of the note")  
        content: str = Field(description="Updated content of the note in markdown format")
    
    # Create bound tools - call the pure functions directly
    @tool(args_schema=SearchInput)
    def bound_search_campaign_context(query: str, limit: int = 5) -> str:
        """Search across all campaign entities for context relevant to the query."""
        return _search_campaign_context(query, user_id, campaign_id, limit)
    
    @tool(args_schema=CreateNoteInput)
    def bound_create_campaign_note(title: str, content: str, note_type: str) -> str:
        """Create a new note in the campaign."""
        return _create_campaign_note(title, content, user_id, campaign_id, note_type)
    
    @tool(args_schema=UpdateNoteInput) 
    def bound_update_campaign_note(note_id: str, title: str, content: str) -> str:
        """Update an existing note's title and content."""
        return _update_campaign_note(note_id, title, content, user_id, campaign_id)
    
    return [bound_search_campaign_context, bound_create_campaign_note, bound_update_campaign_note]


def format_search_results(results: list[VectorSearchResult], category: str) -> str:
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