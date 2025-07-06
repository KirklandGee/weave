from neo4j import GraphDatabase

URI = "bolt://localhost:7687"
AUTH = ("neo4j", "secretgraph")

db = GraphDatabase.driver(URI, auth=AUTH)
db.verify_connectivity()