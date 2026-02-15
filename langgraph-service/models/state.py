"""
LangGraph State Models
Defines the state structures for knowledge processing workflows
"""

from typing import Dict, Any, List, Optional, TypedDict
from enum import Enum

class AgentType(str, Enum):
    INGESTION = "ingestion"
    ALIGNMENT = "alignment"
    CONTRADICTION = "contradiction"
    CURRICULUM = "curriculum"
    RESEARCH = "research"

class KnowledgeNode(TypedDict):
    id: str
    content: str
    embedding: Optional[List[float]]
    metadata: Dict[str, Any]
    confidence: float
    created_at: str
    updated_at: str

class KnowledgeEdge(TypedDict):
    from_id: str
    to_id: str
    type: str
    properties: Dict[str, Any]
    confidence: float

class AgentProposal(TypedDict):
    id: str
    agent_type: AgentType
    action: str
    target_id: Optional[str]
    data: Dict[str, Any]
    confidence: float
    reasoning: str
    timestamp: str

class WorkflowState(TypedDict):
    """Base state for all workflows"""
    workflow_id: str
    status: str  # "running", "completed", "failed"
    current_step: str
    start_time: str
    end_time: Optional[str]
    error: Optional[str]

class KnowledgeIngestionState(WorkflowState):
    """State for knowledge ingestion workflow"""
    content: str
    source: Optional[str]
    metadata: Dict[str, Any]
    nodes_created: List[str]
    edges_created: List[str]
    embedding_generated: bool
    graph_updated: bool

class ReasoningWorkflowState(WorkflowState):
    """State for reasoning workflow"""
    query: str
    context: Dict[str, Any]
    retrieved_nodes: List[KnowledgeNode]
    reasoning_path: List[str]
    answer: Optional[str]
    confidence: float
    contradictions_found: List[Dict[str, Any]]

class ValidationResult(TypedDict):
    is_valid: bool
    confidence: float
    issues: List[str]
    suggestions: List[str]

class ContradictionAnalysis(TypedDict):
    has_contradiction: bool
    conflicting_nodes: List[str]
    severity: str  # "low", "medium", "high"
    resolution_suggestions: List[str]