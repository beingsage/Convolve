"""
Knowledge Ingestion Workflow
LangGraph workflow for processing and integrating new knowledge
"""

import asyncio
from typing import Dict, Any, List
from datetime import datetime

from langgraph.graph import StateGraph, END
from langchain_openai import ChatOpenAI

from models.state import KnowledgeIngestionState
from agents.ingestion import IngestionAgent
from agents.other_agents import AlignmentAgent, ContradictionAgent
from storage.qdrant_client import QdrantClient
from storage.neo4j_client import Neo4jClient

class KnowledgeWorkflow:
    """LangGraph workflow for knowledge ingestion and integration"""

    def __init__(self, qdrant_client: QdrantClient, neo4j_client: Neo4jClient):
        self.qdrant_client = qdrant_client
        self.neo4j_client = neo4j_client

        # Initialize agents
        self.ingestion_agent = IngestionAgent()
        self.alignment_agent = AlignmentAgent()
        self.contradiction_agent = ContradictionAgent()

        # Initialize LLM for decision making
        self.llm = ChatOpenAI(
            model="gpt-4-turbo-preview",
            temperature=0.1
        )

        # Build the workflow graph
        self.workflow = self._build_workflow()

    def _build_workflow(self) -> StateGraph:
        """Build the LangGraph workflow"""

        workflow = StateGraph(KnowledgeIngestionState)

        # Add nodes
        workflow.add_node("validate_content", self._validate_content)
        workflow.add_node("process_content", self._process_content)
        workflow.add_node("check_alignment", self._check_alignment)
        workflow.add_node("detect_contradictions", self._detect_contradictions)
        workflow.add_node("store_embeddings", self._store_embeddings)
        workflow.add_node("update_graph", self._update_graph)
        workflow.add_node("finalize_ingestion", self._finalize_ingestion)

        # Define the flow
        workflow.set_entry_point("validate_content")

        # Validation → Processing
        workflow.add_conditional_edges(
            "validate_content",
            self._should_process,
            {
                "process": "process_content",
                "reject": END
            }
        )

        # Processing → Alignment Check
        workflow.add_edge("process_content", "check_alignment")

        # Alignment → Contradiction Detection
        workflow.add_edge("check_alignment", "detect_contradictions")

        # Contradiction Detection → Storage
        workflow.add_conditional_edges(
            "detect_contradictions",
            self._should_store,
            {
                "store": "store_embeddings",
                "review": END  # Would trigger human review in production
            }
        )

        # Storage → Graph Update
        workflow.add_edge("store_embeddings", "update_graph")

        # Graph Update → Finalize
        workflow.add_edge("update_graph", "finalize_ingestion")

        # Finalize → End
        workflow.add_edge("finalize_ingestion", END)

        return workflow

    async def _validate_content(self, state: KnowledgeIngestionState) -> KnowledgeIngestionState:
        """Validate incoming content"""
        print(f"🔍 Validating content for workflow {state['workflow_id']}")

        validation_result = await self.ingestion_agent.validate_content(state)

        new_state = state.copy()
        new_state.update({
            "current_step": "validation_complete",
            "validation_result": validation_result
        })

        return new_state

    def _should_process(self, state: KnowledgeIngestionState) -> str:
        """Decide whether to process content based on validation"""
        validation = state.get("validation_result", {})
        return "process" if validation.get("is_valid", False) else "reject"

    async def _process_content(self, state: KnowledgeIngestionState) -> KnowledgeIngestionState:
        """Process and chunk content"""
        print(f"⚙️ Processing content for workflow {state['workflow_id']}")

        result = await self.ingestion_agent.process_content(state)

        new_state = state.copy()
        new_state.update({
            "nodes_created": result["nodes"],
            "embeddings_data": result["embeddings"],
            "current_step": "content_processed"
        })

        return new_state

    async def _check_alignment(self, state: KnowledgeIngestionState) -> KnowledgeIngestionState:
        """Check alignment with existing knowledge"""
        print(f"🔗 Checking alignment for workflow {state['workflow_id']}")

        nodes = state.get("nodes_created", [])
        # In production, retrieve existing graph context
        existing_graph = {"nodes": [], "relationships": []}

        alignment_result = await self.alignment_agent.analyze_alignment(nodes, existing_graph)

        new_state = state.copy()
        new_state.update({
            "alignment_result": alignment_result,
            "current_step": "alignment_checked"
        })

        return new_state

    async def _detect_contradictions(self, state: KnowledgeIngestionState) -> KnowledgeIngestionState:
        """Detect contradictions with existing knowledge"""
        print(f"⚠️ Detecting contradictions for workflow {state['workflow_id']}")

        nodes = state.get("nodes_created", [])
        # In production, retrieve existing graph
        existing_graph = {"nodes": [], "relationships": []}

        contradiction_result = await self.contradiction_agent.detect_contradictions(nodes, existing_graph)

        new_state = state.copy()
        new_state.update({
            "contradiction_result": contradiction_result,
            "current_step": "contradictions_checked"
        })

        return new_state

    def _should_store(self, state: KnowledgeIngestionState) -> str:
        """Decide whether to store based on contradiction analysis"""
        contradiction = state.get("contradiction_result", {})
        return "store" if not contradiction.get("has_contradiction", False) else "review"

    async def _store_embeddings(self, state: KnowledgeIngestionState) -> KnowledgeIngestionState:
        """Store embeddings in Qdrant"""
        print(f"💾 Storing embeddings for workflow {state['workflow_id']}")

        embeddings_data = state.get("embeddings_data", [])

        # Store embeddings in Qdrant
        for node_id, embedding, node_data in embeddings_data:
            await self.qdrant_client.store_embedding(
                node_id=node_id,
                embedding=embedding,
                metadata=node_data["metadata"]
            )

        new_state = state.copy()
        new_state.update({
            "embeddings_stored": True,
            "current_step": "embeddings_stored"
        })

        return new_state

    async def _update_graph(self, state: KnowledgeIngestionState) -> KnowledgeIngestionState:
        """Update Neo4j graph with new knowledge"""
        print(f"🕸️ Updating graph for workflow {state['workflow_id']}")

        nodes = state.get("nodes_created", [])
        alignment = state.get("alignment_result", {})

        # Create nodes in Neo4j
        for node_data in nodes:
            await self.neo4j_client.create_knowledge_node(
                node_id=node_data["id"],
                properties={
                    "content": node_data["content"],
                    "confidence": node_data["confidence"],
                    "created_at": node_data["created_at"],
                    "metadata": node_data["metadata"]
                }
            )

        # Create relationships
        relationships = alignment.get("new_relationships", [])
        for rel in relationships:
            await self.neo4j_client.create_relationship(
                from_id=rel["from_id"],
                to_id=rel["to_id"],
                relationship_type=rel["type"],
                properties=rel["properties"]
            )

        new_state = state.copy()
        new_state.update({
            "graph_updated": True,
            "edges_created": [r["from_id"] + "->" + r["to_id"] for r in relationships],
            "current_step": "graph_updated"
        })

        return new_state

    async def _finalize_ingestion(self, state: KnowledgeIngestionState) -> KnowledgeIngestionState:
        """Finalize the ingestion process"""
        print(f"✅ Finalizing ingestion for workflow {state['workflow_id']}")

        new_state = state.copy()
        new_state.update({
            "status": "completed",
            "end_time": datetime.now().isoformat(),
            "current_step": "completed"
        })

        return new_state

    async def run(self, workflow_id: str, content: str, metadata: Dict[str, Any], source: str = None):
        """Run the knowledge ingestion workflow"""
        print(f"🚀 Starting knowledge ingestion workflow {workflow_id}")

        initial_state: KnowledgeIngestionState = {
            "workflow_id": workflow_id,
            "status": "running",
            "current_step": "initialized",
            "start_time": datetime.now().isoformat(),
            "end_time": None,
            "error": None,
            "content": content,
            "source": source,
            "metadata": metadata,
            "nodes_created": [],
            "edges_created": [],
            "embedding_generated": False,
            "graph_updated": False
        }

        try:
            # Compile and run the workflow
            app = self.workflow.compile()

            # Run asynchronously
            result = await app.ainvoke(initial_state)

            print(f"✅ Knowledge ingestion workflow {workflow_id} completed")
            return result

        except Exception as e:
            print(f"❌ Knowledge ingestion workflow {workflow_id} failed: {e}")
            initial_state["status"] = "failed"
            initial_state["error"] = str(e)
            initial_state["end_time"] = datetime.now().isoformat()
            return initial_state