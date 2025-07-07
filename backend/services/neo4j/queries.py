from typing import Any, LiteralString
from neo4j import Query
from backend.models.components import MarkdownNodeBase

def build_create_query(node: MarkdownNodeBase) -> tuple[LiteralString | Query, dict[str, Any]]:
    label = node.get_label()
    props = node.create_props()
    
    # Create different queries for each label type based on seed data
    match label:
        case "Campaign":
            query = "CREATE (n:Campaign $props) RETURN n"
        case "Character":
            query = "CREATE (n:Character $props) RETURN n"
        case "Location":
            query = "CREATE (n:Location $props) RETURN n"
        case "Note":
            query = "CREATE (n:Note $props) RETURN n"
        case "NPC":
            query = "CREATE (n:NPC $props) RETURN n"
        case "Map":
            query = "CREATE (n:Map $props) RETURN n"
        case "Session":
            query = "CREATE (n:Session $props) RETURN n"
        case _:
            query = "CREATE (n $props) RETURN n"
    
    return query, {"props": props}