"""
Ingestion Agent Node
Handles document ingestion, chunking, and initial processing
"""

import uuid
from typing import Dict, Any, List
from datetime import datetime

from sentence_transformers import SentenceTransformer
from langchain.text_splitter import RecursiveCharacterTextSplitter

from models.state import KnowledgeIngestionState, KnowledgeNode, AgentProposal, AgentType

class IngestionAgent:
    """Agent responsible for ingesting and preprocessing knowledge content"""

    def __init__(self, embeddings_model=None):
        # Use local sentence-transformers model instead of OpenAI
        self.embeddings = embeddings_model or SentenceTransformer("BAAI/bge-base-en-v1.5")
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            separators=["\n\n", "\n", ". ", " ", ""]
        )

    async def process_content(self, state: KnowledgeIngestionState) -> Dict[str, Any]:
        """Process incoming content and create knowledge nodes"""

        content = state["content"]
        metadata = state.get("metadata", {})
        source = state.get("source")

        # Split content into chunks
        chunks = self.text_splitter.split_text(content)

        nodes_created = []
        embeddings = []

        # Process each chunk
        for i, chunk in enumerate(chunks):
            node_id = f"{state['workflow_id']}_chunk_{i}"

            # Generate embedding using sentence-transformers
            embedding = self.embeddings.encode(chunk).tolist()

            # Create knowledge node
            node: KnowledgeNode = {
                "id": node_id,
                "content": chunk,
                "embedding": embedding,
                "metadata": {
                    **metadata,
                    "source": source,
                    "chunk_index": i,
                    "total_chunks": len(chunks),
                    "content_length": len(chunk)
                },
                "confidence": 0.8,  # Initial confidence
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat()
            }

            nodes_created.append(node_id)
            embeddings.append((node_id, embedding, node))

        # Update state
        new_state = state.copy()
        new_state.update({
            "nodes_created": nodes_created,
            "embedding_generated": True,
            "current_step": "content_processed"
        })

        return {
            "nodes": nodes_created,
            "embeddings": embeddings,
            "state": new_state
        }

    async def validate_content(self, state: KnowledgeIngestionState) -> Dict[str, Any]:
        """Validate the ingested content quality"""

        content = state["content"]

        # Basic validation checks
        issues = []
        suggestions = []

        if len(content.strip()) < 10:
            issues.append("Content too short")
            suggestions.append("Provide more detailed content")

        if len(content.split()) < 5:
            issues.append("Content has too few words")
            suggestions.append("Expand on the topic with more information")

        # Check for common issues
        if content.count('?') > content.count('.'):
            suggestions.append("Content appears to be mostly questions - consider adding explanatory text")

        confidence = 1.0 - (len(issues) * 0.2)  # Reduce confidence for each issue

        return {
            "is_valid": len(issues) == 0,
            "confidence": max(0.1, confidence),
            "issues": issues,
            "suggestions": suggestions
        }

    async def generate_proposal(self, state: KnowledgeIngestionState, validation_result: Dict[str, Any]) -> AgentProposal:
        """Generate a proposal for the ingestion action"""

        return {
            "id": f"ingest_{uuid.uuid4().hex[:8]}",
            "agent_type": AgentType.INGESTION,
            "action": "ingest_content",
            "target_id": None,
            "data": {
                "content_length": len(state["content"]),
                "chunks_created": len(state.get("nodes_created", [])),
                "validation_result": validation_result
            },
            "confidence": validation_result["confidence"],
            "reasoning": f"Content ingestion with {validation_result['confidence']:.2f} confidence",
            "timestamp": datetime.now().isoformat()
        }