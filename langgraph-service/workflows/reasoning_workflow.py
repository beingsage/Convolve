"""
Reasoning Workflow
LangGraph workflow for query processing and answer generation
"""

import asyncio
from typing import Dict, Any, List
from datetime import datetime

from langgraph.graph import StateGraph, END
from langchain_openai import ChatOpenAI

from models.state import ReasoningWorkflowState, KnowledgeNode
from agents.other_agents import ResearchAgent, ContradictionAgent
from storage.qdrant_client import QdrantClient
from storage.neo4j_client import Neo4jClient

class ReasoningWorkflow:
    """LangGraph workflow for reasoning and answer generation"""

    def __init__(self, qdrant_client: QdrantClient, neo4j_client: Neo4jClient):
        self.qdrant_client = qdrant_client
        self.neo4j_client = neo4j_client

        # Initialize agents
        self.research_agent = ResearchAgent()
        self.contradiction_agent = ContradictionAgent()

        # Initialize LLM for reasoning
        self.llm = ChatOpenAI(
            model="gpt-4-turbo-preview",
            temperature=0.2
        )

        # Build the workflow graph
        self.workflow = self._build_workflow()

    def _build_workflow(self) -> StateGraph:
        """Build the LangGraph workflow"""

        workflow = StateGraph(ReasoningWorkflowState)

        # Add nodes
        workflow.add_node("analyze_query", self._analyze_query)
        workflow.add_node("retrieve_knowledge", self._retrieve_knowledge)
        workflow.add_node("check_contradictions", self._check_contradictions)
        workflow.add_node("generate_reasoning", self._generate_reasoning)
        workflow.add_node("identify_gaps", self._identify_gaps)
        workflow.add_node("formulate_answer", self._formulate_answer)
        workflow.add_node("finalize_reasoning", self._finalize_reasoning)

        # Define the flow
        workflow.set_entry_point("analyze_query")

        # Query Analysis → Knowledge Retrieval
        workflow.add_edge("analyze_query", "retrieve_knowledge")

        # Knowledge Retrieval → Contradiction Check
        workflow.add_edge("retrieve_knowledge", "check_contradictions")

        # Contradiction Check → Reasoning Generation
        workflow.add_conditional_edges(
            "check_contradictions",
            self._should_continue_reasoning,
            {
                "continue": "generate_reasoning",
                "stop": "finalize_reasoning"
            }
        )

        # Reasoning Generation → Gap Identification
        workflow.add_edge("generate_reasoning", "identify_gaps")

        # Gap Identification → Answer Formulation
        workflow.add_edge("identify_gaps", "formulate_answer")

        # Answer Formulation → Finalize
        workflow.add_edge("formulate_answer", "finalize_reasoning")

        # Finalize → End
        workflow.add_edge("finalize_reasoning", END)

        return workflow

    async def _analyze_query(self, state: ReasoningWorkflowState) -> ReasoningWorkflowState:
        """Analyze the input query"""
        print(f"🔍 Analyzing query for workflow {state['workflow_id']}")

        query = state["query"]

        # Use LLM to analyze query intent and extract key terms
        analysis_prompt = f"""
        Analyze this query and extract key information:
        Query: {query}

        Provide:
        1. Query type (factual, explanatory, comparative, etc.)
        2. Key terms and concepts
        3. Expected answer format
        4. Complexity level (simple, moderate, complex)
        """

        analysis_response = await self.llm.ainvoke(analysis_prompt)
        analysis_text = analysis_response.content

        new_state = state.copy()
        new_state.update({
            "query_analysis": analysis_text,
            "current_step": "query_analyzed"
        })

        return new_state

    async def _retrieve_knowledge(self, state: ReasoningWorkflowState) -> ReasoningWorkflowState:
        """Retrieve relevant knowledge from vector and graph stores"""
        print(f"📚 Retrieving knowledge for workflow {state['workflow_id']}")

        query = state["query"]

        # Generate query embedding for vector search using sentence-transformers
        from sentence_transformers import SentenceTransformer
        embeddings = SentenceTransformer("BAAI/bge-base-en-v1.5")
        query_embedding = embeddings.encode(query).tolist()

        # Search Qdrant for similar content
        vector_results = await self.qdrant_client.search_similar(query_embedding, limit=10)

        # Search Neo4j for related concepts
        graph_results = await self.neo4j_client.search_nodes(query, limit=5)

        # Combine and deduplicate results
        retrieved_nodes = self._combine_search_results(vector_results, graph_results)

        new_state = state.copy()
        new_state.update({
            "retrieved_nodes": retrieved_nodes,
            "vector_results": vector_results,
            "graph_results": graph_results,
            "current_step": "knowledge_retrieved"
        })

        return new_state

    def _combine_search_results(self, vector_results: List[Dict[str, Any]], graph_results: List[Dict[str, Any]]) -> List[KnowledgeNode]:
        """Combine and deduplicate search results"""
        combined = {}

        # Process vector results
        for result in vector_results:
            node_id = result["id"]
            if node_id not in combined:
                combined[node_id] = {
                    "id": node_id,
                    "content": result["metadata"].get("content", ""),
                    "embedding": None,  # Would be retrieved separately if needed
                    "metadata": result["metadata"],
                    "confidence": result["score"],
                    "created_at": result["metadata"].get("created_at", ""),
                    "updated_at": result["metadata"].get("updated_at", "")
                }

        # Process graph results
        for result in graph_results:
            node_data = result["node"]
            node_id = node_data.get("id")
            if node_id and node_id not in combined:
                combined[node_id] = {
                    "id": node_id,
                    "content": node_data.get("content", ""),
                    "embedding": None,
                    "metadata": node_data.get("metadata", {}),
                    "confidence": result["score"],
                    "created_at": node_data.get("created_at", ""),
                    "updated_at": node_data.get("updated_at", "")
                }

        return list(combined.values())

    async def _check_contradictions(self, state: ReasoningWorkflowState) -> ReasoningWorkflowState:
        """Check for contradictions in retrieved knowledge"""
        print(f"⚠️ Checking contradictions for workflow {state['workflow_id']}")

        retrieved_nodes = state.get("retrieved_nodes", [])

        # Use contradiction agent
        contradiction_result = await self.contradiction_agent.detect_contradictions(
            retrieved_nodes,
            {"nodes": retrieved_nodes}  # Simplified existing graph
        )

        new_state = state.copy()
        new_state.update({
            "contradictions_found": contradiction_result.get("conflicting_nodes", []),
            "contradiction_analysis": contradiction_result,
            "current_step": "contradictions_checked"
        })

        return new_state

    def _should_continue_reasoning(self, state: ReasoningWorkflowState) -> str:
        """Decide whether to continue with reasoning"""
        contradictions = state.get("contradictions_found", [])
        return "stop" if len(contradictions) > 2 else "continue"  # Stop if too many contradictions

    async def _generate_reasoning(self, state: ReasoningWorkflowState) -> ReasoningWorkflowState:
        """Generate reasoning path through the knowledge graph"""
        print(f"🧠 Generating reasoning for workflow {state['workflow_id']}")

        query = state["query"]
        retrieved_nodes = state.get("retrieved_nodes", [])

        # Use LLM to generate reasoning steps
        reasoning_prompt = f"""
        Based on the query and retrieved knowledge, generate a reasoning path:

        Query: {query}

        Retrieved Knowledge:
        {self._format_nodes_for_reasoning(retrieved_nodes)}

        Provide:
        1. Step-by-step reasoning process
        2. Key insights from the knowledge
        3. Connections between different pieces of information
        4. Confidence in the reasoning
        """

        reasoning_response = await self.llm.ainvoke(reasoning_prompt)
        reasoning_text = reasoning_response.content

        # Extract reasoning path (simplified)
        reasoning_path = [node["id"] for node in retrieved_nodes[:3]]  # Top 3 nodes

        new_state = state.copy()
        new_state.update({
            "reasoning_text": reasoning_text,
            "reasoning_path": reasoning_path,
            "current_step": "reasoning_generated"
        })

        return new_state

    def _format_nodes_for_reasoning(self, nodes: List[KnowledgeNode]) -> str:
        """Format nodes for reasoning prompt"""
        formatted = []
        for node in nodes[:5]:  # Limit to top 5
            formatted.append(f"- {node['content'][:200]}...")
        return "\n".join(formatted)

    async def _identify_gaps(self, state: ReasoningWorkflowState) -> ReasoningWorkflowState:
        """Identify knowledge gaps in the reasoning"""
        print(f"🔍 Identifying gaps for workflow {state['workflow_id']}")

        query = state["query"]
        retrieved_nodes = state.get("retrieved_nodes", [])

        gap_analysis = await self.research_agent.identify_gaps(query, retrieved_nodes)

        new_state = state.copy()
        new_state.update({
            "gap_analysis": gap_analysis,
            "current_step": "gaps_identified"
        })

        return new_state

    async def _formulate_answer(self, state: ReasoningWorkflowState) -> ReasoningWorkflowState:
        """Formulate the final answer"""
        print(f"💡 Formulating answer for workflow {state['workflow_id']}")

        query = state["query"]
        reasoning_text = state.get("reasoning_text", "")
        gap_analysis = state.get("gap_analysis", {})
        contradictions = state.get("contradictions_found", [])

        # Use LLM to formulate comprehensive answer
        answer_prompt = f"""
        Formulate a comprehensive answer based on the reasoning and analysis:

        Query: {query}

        Reasoning: {reasoning_text}

        Knowledge Gaps: {gap_analysis.get('gaps', [])}

        Contradictions Found: {len(contradictions)}

        Provide:
        1. Direct answer to the query
        2. Explanation with evidence
        3. Confidence level (high/medium/low)
        4. Any limitations or caveats
        """

        answer_response = await self.llm.ainvoke(answer_prompt)
        answer_text = answer_response.content

        # Extract confidence from response (simplified)
        confidence = 0.8
        if "low confidence" in answer_text.lower():
            confidence = 0.5
        elif "high confidence" in answer_text.lower():
            confidence = 0.9

        new_state = state.copy()
        new_state.update({
            "answer": answer_text,
            "confidence": confidence,
            "current_step": "answer_formulated"
        })

        return new_state

    async def _finalize_reasoning(self, state: ReasoningWorkflowState) -> ReasoningWorkflowState:
        """Finalize the reasoning process"""
        print(f"✅ Finalizing reasoning for workflow {state['workflow_id']}")

        new_state = state.copy()
        new_state.update({
            "status": "completed",
            "end_time": datetime.now().isoformat(),
            "current_step": "completed"
        })

        return new_state

    async def run(self, workflow_id: str, query: str, context: Dict[str, Any]):
        """Run the reasoning workflow"""
        print(f"🚀 Starting reasoning workflow {workflow_id}")

        initial_state: ReasoningWorkflowState = {
            "workflow_id": workflow_id,
            "status": "running",
            "current_step": "initialized",
            "start_time": datetime.now().isoformat(),
            "end_time": None,
            "error": None,
            "query": query,
            "context": context,
            "retrieved_nodes": [],
            "reasoning_path": [],
            "answer": None,
            "confidence": 0.0,
            "contradictions_found": []
        }

        try:
            # Compile and run the workflow
            app = self.workflow.compile()

            # Run asynchronously
            result = await app.ainvoke(initial_state)

            print(f"✅ Reasoning workflow {workflow_id} completed")
            return result

        except Exception as e:
            print(f"❌ Reasoning workflow {workflow_id} failed: {e}")
            initial_state["status"] = "failed"
            initial_state["error"] = str(e)
            initial_state["end_time"] = datetime.now().isoformat()
            return initial_state