"""
Other Agent Nodes
Alignment, Contradiction, Curriculum, and Research agents
"""

import uuid
from typing import Dict, Any, List
from datetime import datetime

from models.state import (
    KnowledgeIngestionState,
    ReasoningWorkflowState,
    KnowledgeNode,
    AgentProposal,
    AgentType,
    ContradictionAnalysis
)

class AlignmentAgent:
    """Agent responsible for aligning knowledge with existing graph"""

    async def analyze_alignment(self, nodes: List[KnowledgeNode], existing_graph: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze how new nodes align with existing knowledge"""

        alignments = []
        new_relationships = []

        for node in nodes:
            # Find semantically similar existing nodes
            similar_nodes = existing_graph.get("similar_nodes", [])

            for similar in similar_nodes:
                if self._calculate_similarity(node, similar) > 0.7:
                    alignments.append({
                        "new_node": node["id"],
                        "existing_node": similar["id"],
                        "similarity": self._calculate_similarity(node, similar),
                        "relationship_type": "SIMILAR_TO"
                    })

                    new_relationships.append({
                        "from_id": node["id"],
                        "to_id": similar["id"],
                        "type": "SIMILAR_TO",
                        "properties": {"similarity_score": self._calculate_similarity(node, similar)},
                        "confidence": 0.8
                    })

        return {
            "alignments": alignments,
            "new_relationships": new_relationships,
            "integration_confidence": 0.85
        }

    def _calculate_similarity(self, node1: KnowledgeNode, node2: KnowledgeNode) -> float:
        """Calculate semantic similarity between nodes"""
        # Simplified similarity calculation
        # In production, use embeddings comparison
        content1 = node1["content"].lower()
        content2 = node2["content"].lower()

        words1 = set(content1.split())
        words2 = set(content2.split())

        intersection = words1.intersection(words2)
        union = words1.union(words2)

        return len(intersection) / len(union) if union else 0.0

class ContradictionAgent:
    """Agent responsible for detecting contradictions in knowledge"""

    async def detect_contradictions(self, nodes: List[KnowledgeNode], existing_graph: Dict[str, Any]) -> ContradictionAnalysis:
        """Detect contradictions between new and existing knowledge"""

        contradictions = []

        for node in nodes:
            # Check against existing nodes for contradictions
            existing_nodes = existing_graph.get("nodes", [])

            for existing in existing_nodes:
                contradiction = self._check_contradiction(node, existing)
                if contradiction:
                    contradictions.append({
                        "node1": node["id"],
                        "node2": existing["id"],
                        "type": contradiction["type"],
                        "description": contradiction["description"],
                        "severity": contradiction["severity"]
                    })

        severity_levels = {"low": 1, "medium": 2, "high": 3}
        max_severity = max([c["severity"] for c in contradictions], default="low")

        return {
            "has_contradiction": len(contradictions) > 0,
            "conflicting_nodes": [c["node1"] for c in contradictions],
            "severity": max_severity,
            "resolution_suggestions": self._generate_resolution_suggestions(contradictions)
        }

    def _check_contradiction(self, node1: KnowledgeNode, node2: KnowledgeNode) -> Optional[Dict[str, Any]]:
        """Check for contradictions between two nodes"""
        # Simplified contradiction detection
        # In production, use NLP models for factual contradiction detection
        content1 = node1["content"].lower()
        content2 = node2["content"].lower()

        # Look for direct contradictions
        contradiction_patterns = [
            ("is", "is not"),
            ("true", "false"),
            ("yes", "no"),
            ("correct", "incorrect")
        ]

        for pos, neg in contradiction_patterns:
            if pos in content1 and neg in content2:
                return {
                    "type": "direct_contradiction",
                    "description": f"Direct contradiction detected: '{pos}' vs '{neg}'",
                    "severity": "high"
                }

        return None

    def _generate_resolution_suggestions(self, contradictions: List[Dict[str, Any]]) -> List[str]:
        """Generate suggestions for resolving contradictions"""
        suggestions = []

        for contradiction in contradictions:
            suggestions.append(f"Review nodes {contradiction['node1']} and {contradiction['node2']} for factual accuracy")
            suggestions.append("Consider updating confidence scores based on source reliability")
            suggestions.append("May require human expert review for resolution")

        return suggestions

class CurriculumAgent:
    """Agent responsible for curriculum and learning path generation"""

    async def generate_curriculum(self, topic: str, existing_knowledge: Dict[str, Any]) -> Dict[str, Any]:
        """Generate a learning curriculum based on knowledge graph"""

        # Analyze knowledge structure
        concepts = existing_knowledge.get("concepts", [])
        relationships = existing_knowledge.get("relationships", [])

        # Build learning path
        learning_path = self._build_learning_path(concepts, relationships)

        # Generate curriculum structure
        curriculum = {
            "topic": topic,
            "learning_path": learning_path,
            "prerequisites": self._identify_prerequisites(learning_path),
            "difficulty_progression": self._calculate_difficulty_progression(learning_path),
            "estimated_time": self._estimate_completion_time(learning_path)
        }

        return curriculum

    def _build_learning_path(self, concepts: List[Dict[str, Any]], relationships: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Build an ordered learning path from concepts and relationships"""
        # Simplified topological sort
        # In production, use proper graph algorithms
        path = []

        # Start with foundational concepts
        foundational = [c for c in concepts if c.get("difficulty", "intermediate") == "beginner"]
        path.extend(foundational)

        # Add intermediate concepts
        intermediate = [c for c in concepts if c.get("difficulty", "intermediate") == "intermediate"]
        path.extend(intermediate)

        # Add advanced concepts
        advanced = [c for c in concepts if c.get("difficulty", "intermediate") == "advanced"]
        path.extend(advanced)

        return path

    def _identify_prerequisites(self, learning_path: List[Dict[str, Any]]) -> List[str]:
        """Identify prerequisite knowledge"""
        prerequisites = []

        for i, concept in enumerate(learning_path):
            if i > 0:
                prev_concept = learning_path[i-1]
                prerequisites.append(f"{concept['name']} requires understanding of {prev_concept['name']}")

        return prerequisites

    def _calculate_difficulty_progression(self, learning_path: List[Dict[str, Any]]) -> List[str]:
        """Calculate difficulty progression"""
        return [concept.get("difficulty", "intermediate") for concept in learning_path]

    def _estimate_completion_time(self, learning_path: List[Dict[str, Any]]) -> str:
        """Estimate time to complete the curriculum"""
        total_concepts = len(learning_path)
        estimated_hours = total_concepts * 2  # 2 hours per concept

        if estimated_hours < 24:
            return f"{estimated_hours} hours"
        else:
            return f"{estimated_hours // 24} days"

class ResearchAgent:
    """Agent responsible for research and knowledge gap identification"""

    async def identify_gaps(self, query: str, retrieved_nodes: List[KnowledgeNode]) -> Dict[str, Any]:
        """Identify knowledge gaps in response to a query"""

        gaps = []
        coverage_score = 0.0

        # Analyze query components
        query_terms = set(query.lower().split())

        # Check coverage in retrieved nodes
        covered_terms = set()
        for node in retrieved_nodes:
            node_terms = set(node["content"].lower().split())
            covered_terms.update(node_terms.intersection(query_terms))

        # Identify missing terms
        missing_terms = query_terms - covered_terms

        if missing_terms:
            gaps.append({
                "type": "terminology_gap",
                "description": f"Missing information about: {', '.join(missing_terms)}",
                "severity": "medium"
            })

        # Calculate coverage score
        coverage_score = len(covered_terms) / len(query_terms) if query_terms else 1.0

        # Identify conceptual gaps
        conceptual_gaps = self._identify_conceptual_gaps(query, retrieved_nodes)
        gaps.extend(conceptual_gaps)

        return {
            "gaps": gaps,
            "coverage_score": coverage_score,
            "research_suggestions": self._generate_research_suggestions(gaps)
        }

    def _identify_conceptual_gaps(self, query: str, nodes: List[KnowledgeNode]) -> List[Dict[str, Any]]:
        """Identify conceptual gaps in the knowledge"""
        gaps = []

        # Check for depth of explanation
        shallow_responses = []
        for node in nodes:
            if len(node["content"].split()) < 50:  # Arbitrary threshold
                shallow_responses.append(node["id"])

        if shallow_responses:
            gaps.append({
                "type": "depth_gap",
                "description": f"Some concepts lack detailed explanations (nodes: {', '.join(shallow_responses)})",
                "severity": "low"
            })

        # Check for recency
        # This would check timestamps in production

        return gaps

    def _generate_research_suggestions(self, gaps: List[Dict[str, Any]]) -> List[str]:
        """Generate research suggestions based on identified gaps"""
        suggestions = []

        for gap in gaps:
            if gap["type"] == "terminology_gap":
                suggestions.append(f"Research the missing terms: {gap['description']}")
            elif gap["type"] == "depth_gap":
                suggestions.append("Expand explanations for identified shallow concepts")
            elif gap["type"] == "recency_gap":
                suggestions.append("Update outdated information")

        return suggestions