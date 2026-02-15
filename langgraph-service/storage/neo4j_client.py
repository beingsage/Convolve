"""
Neo4j Graph Database Client
Handles graph operations for knowledge relationships and reasoning
"""

import os
import asyncio
from typing import List, Dict, Any, Optional
from neo4j import AsyncGraphDatabase, AsyncDriver

class Neo4jClient:
    """Neo4j client for graph operations"""

    def __init__(self):
        self.uri = os.getenv("NEO4J_URI", "neo4j://localhost:7687")
        self.username = os.getenv("NEO4J_USERNAME", "neo4j")
        self.password = os.getenv("NEO4J_PASSWORD", "password")
        self.driver: Optional[AsyncDriver] = None

    async def connect(self):
        """Connect to Neo4j database"""
        try:
            self.driver = AsyncGraphDatabase.driver(
                self.uri,
                auth=(self.username, self.password)
            )
            # Test connection
            await self.driver.verify_connectivity()
            print("✅ Connected to Neo4j")
        except Exception as e:
            print(f"❌ Failed to connect to Neo4j: {e}")
            raise

    async def disconnect(self):
        """Disconnect from Neo4j database"""
        if self.driver:
            await self.driver.close()

    async def create_knowledge_node(self, node_id: str, properties: Dict[str, Any]) -> str:
        """Create a knowledge node"""
        query = """
        CREATE (n:KnowledgeNode {id: $id})
        SET n += $properties
        RETURN n.id as id
        """

        async with self.driver.session() as session:
            result = await session.run(query, id=node_id, properties=properties)
            record = await result.single()
            return record["id"] if record else node_id

    async def create_relationship(self, from_id: str, to_id: str, relationship_type: str, properties: Dict[str, Any] = None):
        """Create a relationship between nodes"""
        if properties is None:
            properties = {}

        query = f"""
        MATCH (a:KnowledgeNode {{id: $from_id}}), (b:KnowledgeNode {{id: $to_id}})
        CREATE (a)-[r:{relationship_type}]->(b)
        SET r += $properties
        """

        async with self.driver.session() as session:
            await session.run(query, from_id=from_id, to_id=to_id, properties=properties)

    async def get_node(self, node_id: str) -> Optional[Dict[str, Any]]:
        """Get node by ID"""
        query = """
        MATCH (n:KnowledgeNode {id: $id})
        RETURN n
        """

        async with self.driver.session() as session:
            result = await session.run(query, id=node_id)
            record = await result.single()
            return dict(record["n"]) if record else None

    async def search_nodes(self, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Search nodes using full-text search"""
        search_query = """
        CALL db.index.fulltext.queryNodes("knowledgeNodes", $query)
        YIELD node, score
        RETURN node, score
        LIMIT $limit
        """

        async with self.driver.session() as session:
            result = await session.run(search_query, query=query, limit=limit)
            return [
                {"node": dict(record["node"]), "score": record["score"]}
                async for record in result
            ]

    async def get_related_nodes(self, node_id: str, relationship_type: Optional[str] = None, depth: int = 1) -> List[Dict[str, Any]]:
        """Get related nodes with relationships"""
        if relationship_type:
            query = f"""
            MATCH (n:KnowledgeNode {{id: $id}})-[r:{relationship_type}*1..{depth}]-(related:KnowledgeNode)
            RETURN related, r, type(r) as rel_type
            """
        else:
            query = f"""
            MATCH (n:KnowledgeNode {{id: $id}})-[r*1..{depth}]-(related:KnowledgeNode)
            RETURN related, r, type(r) as rel_type
            """

        async with self.driver.session() as session:
            result = await session.run(query, id=node_id)
            return [
                {
                    "node": dict(record["related"]),
                    "relationship": record["rel_type"],
                    "path": record["r"]
                }
                async for record in result
            ]

    async def update_node_properties(self, node_id: str, properties: Dict[str, Any]):
        """Update node properties"""
        query = """
        MATCH (n:KnowledgeNode {id: $id})
        SET n += $properties
        """

        async with self.driver.session() as session:
            await session.run(query, id=node_id, properties=properties)

    async def delete_node(self, node_id: str):
        """Delete node and its relationships"""
        query = """
        MATCH (n:KnowledgeNode {id: $id})
        DETACH DELETE n
        """

        async with self.driver.session() as session:
            await session.run(query, id=node_id)

    async def execute_cypher(self, query: str, parameters: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        """Execute custom Cypher query"""
        if parameters is None:
            parameters = {}

        async with self.driver.session() as session:
            result = await session.run(query, parameters)
            return [dict(record) async for record in result]

    async def create_fulltext_index(self):
        """Create full-text index for knowledge nodes"""
        try:
            query = """
            CALL db.index.fulltext.createNodeIndex(
                "knowledgeNodes",
                ["KnowledgeNode"],
                ["content", "title", "summary"]
            )
            """
            async with self.driver.session() as session:
                await session.run(query)
        except Exception as e:
            # Index might already exist
            print(f"Full-text index creation note: {e}")