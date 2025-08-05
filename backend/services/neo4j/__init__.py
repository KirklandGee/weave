from typing import LiteralString
from neo4j import GraphDatabase, Query
from neo4j.exceptions import Neo4jError, ServiceUnavailable, AuthError
import os

_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
_USER = os.getenv("NEO4J_USERNAME", "neo4j")
_PASS = os.getenv("NEO4J_PASSWORD", "secretgraph")

_driver = GraphDatabase.driver(
    _URI, 
    auth=(_USER, _PASS), 
    max_connection_pool_size=5,  # Reduced for Aura free tier
    max_connection_lifetime=1800,  # 30 minutes
    connection_acquisition_timeout=30  # 30 seconds
)


def verify() -> None:
    """
    Call once at application startup.
    Raises RuntimeError if the DB is unreachable or auth fails.
    """
    try:
        _driver.verify_connectivity()  # does auth & bolt handshake
    except (ServiceUnavailable, AuthError, Neo4jError) as exc:
        raise RuntimeError(f"Neo4j unreachable: {_URI}") from exc


def query(cypher: LiteralString | Query, **params: object):

    try:
        res = _driver.execute_query(
            cypher, params or None, database_=None, routing_="w"
        )
        return [r.data() for r in res.records]

    except Exception as exc:
        print(exc)
        raise


def close():
    _driver.close()
