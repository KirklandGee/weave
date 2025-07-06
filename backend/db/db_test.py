from neo4j import GraphDatabase

URI = "bolt://localhost:7687"
AUTH = ("neo4j", "secretgraph")

driver = GraphDatabase.driver(URI, auth=AUTH)


def load_cypher_statements(path: str):
    with open(path, "r", encoding="utf-8") as f:
        script = f.read()

        # Naively split on semicolons
    statements = [stmt.strip() for stmt in script.split(";") if stmt.strip()]
    return statements


def test_connection():
    driver.verify_connectivity()
    print("Connection established!")

    return driver.execute_query(
        """MATCH (c:Character)-[:VISITED]->(l:Location {name: "Shadowfell Keep"})
RETURN c {
  .id,
  .name,
  .class,
  .race,
  .markdown
}"""
    )
