"""
Qdrant Vector Database Client
Handles vector operations for embeddings and similarity search
"""

import os
from typing import List, Dict, Any, Optional
from qdrant_client import QdrantClient
from qdrant_client.http.models import Distance, VectorParams, PointStruct

class QdrantClient:
    """Qdrant client for vector operations"""

    def __init__(self):
        self.url = os.getenv("QDRANT_URL", "http://localhost:6333")
        self.api_key = os.getenv("QDRANT_API_KEY")
        self.client = QdrantClient(url=self.url, api_key=self.api_key)

        # Collection names
        self.knowledge_collection = "knowledge_nodes"
        self.embedding_collection = "embeddings"

        # Initialize collections
        self._ensure_collections()

    def _ensure_collections(self):
        """Ensure required collections exist"""
        try:
            # Knowledge nodes collection (for metadata)
            self.client.get_collection(self.knowledge_collection)
        except Exception:
            self.client.create_collection(
                collection_name=self.knowledge_collection,
                vectors_config=VectorParams(size=1536, distance=Distance.COSINE)
            )

        try:
            # Embeddings collection
            self.client.get_collection(self.embedding_collection)
        except Exception:
            self.client.create_collection(
                collection_name=self.embedding_collection,
                vectors_config=VectorParams(size=1536, distance=Distance.COSINE)
            )

    async def store_embedding(self, node_id: str, embedding: List[float], metadata: Dict[str, Any]):
        """Store embedding with metadata"""
        try:
            point = PointStruct(
                id=node_id,
                vector=embedding,
                payload=metadata
            )
            self.client.upsert(
                collection_name=self.embedding_collection,
                points=[point]
            )
        except Exception as e:
            print(f"Failed to store embedding: {e}")
            raise

    async def search_similar(self, query_embedding: List[float], limit: int = 10) -> List[Dict[str, Any]]:
        """Search for similar embeddings"""
        try:
            results = self.client.search(
                collection_name=self.embedding_collection,
                query_vector=query_embedding,
                limit=limit
            )

            return [
                {
                    "id": hit.id,
                    "score": hit.score,
                    "metadata": hit.payload
                }
                for hit in results
            ]
        except Exception as e:
            print(f"Failed to search embeddings: {e}")
            return []

    async def get_embedding(self, node_id: str) -> Optional[Dict[str, Any]]:
        """Get embedding by node ID"""
        try:
            result = self.client.retrieve(
                collection_name=self.embedding_collection,
                ids=[node_id]
            )
            return result[0].payload if result else None
        except Exception as e:
            print(f"Failed to get embedding: {e}")
            return None

    async def delete_embedding(self, node_id: str):
        """Delete embedding by node ID"""
        try:
            self.client.delete(
                collection_name=self.embedding_collection,
                points_selector={"ids": [node_id]}
            )
        except Exception as e:
            print(f"Failed to delete embedding: {e}")
            raise

    async def batch_store_embeddings(self, points: List[PointStruct]):
        """Batch store multiple embeddings"""
        try:
            self.client.upsert(
                collection_name=self.embedding_collection,
                points=points
            )
        except Exception as e:
            print(f"Failed to batch store embeddings: {e}")
            raise