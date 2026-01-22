/**
 * Complete Agent Implementations
 * All 5 agents with real logic
 */

import { KnowledgeNode, KnowledgeEdge } from '@/lib/types';
import { ReasoningEngine } from '@/lib/services/reasoning-engine';
import { getEmbeddingEngine } from '@/lib/services/embedding-engine';
import { v4 as uuidv4 } from 'uuid';

export interface AgentProposal {
  id: string;
  agent: string;
  action: 'create' | 'update' | 'merge' | 'delete' | 'link';
  target: string;
  payload: any;
  reasoning: string;
  confidence: number;
}

export class IngestionAgent {
  /**
   * Ingest new concepts from chunks
   */
  static async process(
    chunks: any[],
    existingNodes: Map<string, KnowledgeNode>,
    storage: any
  ): Promise<AgentProposal[]> {
    const proposals: AgentProposal[] = [];
    const embeddingEngine = getEmbeddingEngine();

    for (const chunk of chunks) {
      // Extract concepts from chunk
      const keywords = embeddingEngine.extractKeywords(chunk.content, 3);

      for (const keyword of keywords) {
        // Check if concept already exists
        const existing = Array.from(existingNodes.values()).find(
          (n) => n.name.toLowerCase() === keyword.toLowerCase()
        );

        if (!existing) {
          // Propose new concept
          const proposal: AgentProposal = {
            id: uuidv4(),
            agent: 'IngestionAgent',
            action: 'create',
            target: keyword,
            payload: {
              name: keyword,
              description: `Concept from document chunk: ${chunk.section}`,
              type: 'concept',
              level: {
                abstraction: 0.5,
                difficulty: 0.5,
                volatility: 0.3,
              },
              cognitive_state: {
                strength: 0.7,
                activation: 0.8,
                decay_rate: 0.01,
                confidence: 0.75,
              },
            },
            reasoning: `Extracted from chunk in "${chunk.section}" with ${chunk.concept_refs?.length || 0} concept references`,
            confidence: 0.75,
          };

          proposals.push(proposal);
        }
      }
    }

    console.log(`[Ingestion Agent] Found ${proposals.length} new concepts to ingest`);
    return proposals;
  }
}

export class AlignmentAgent {
  /**
   * Detect duplicate concepts and suggest merging
   */
  static async process(
    nodes: Map<string, KnowledgeNode>
  ): Promise<AgentProposal[]> {
    const proposals: AgentProposal[] = [];
    const embeddingEngine = getEmbeddingEngine();

    const nodeArray = Array.from(nodes.values());

    // Similarity-based deduplication
    for (let i = 0; i < nodeArray.length; i++) {
      for (let j = i + 1; j < nodeArray.length; j++) {
        const nodeA = nodeArray[i];
        const nodeB = nodeArray[j];

        // Compute name similarity (Levenshtein-like)
        const similarity = this.nameSimilarity(nodeA.name, nodeB.name);

        if (similarity > 0.7) {
          // High similarity - suggest merge
          const proposal: AgentProposal = {
            id: uuidv4(),
            agent: 'AlignmentAgent',
            action: 'merge',
            target: nodeA.id,
            payload: {
              merge_with: nodeB.id,
              canonical_name: nodeA.name, // Use first one as canonical
              reason: 'High name similarity suggests duplication',
            },
            reasoning: `"${nodeA.name}" and "${nodeB.name}" are ${(similarity * 100).toFixed(0)}% similar. Recommend merging.`,
            confidence: similarity,
          };

          proposals.push(proposal);
        }
      }
    }

    console.log(`[Alignment Agent] Found ${proposals.length} potential duplicates`);
    return proposals;
  }

  private static nameSimilarity(a: string, b: string): number {
    a = a.toLowerCase();
    b = b.toLowerCase();

    if (a === b) return 1;

    const aTokens = new Set(a.split(/\s+/));
    const bTokens = new Set(b.split(/\s+/));

    const intersection = Array.from(aTokens).filter((t) => bTokens.has(t)).length;
    const union = new Set([...aTokens, ...bTokens]).size;

    return union > 0 ? intersection / union : 0;
  }
}

export class ContradictionAgent {
  /**
   * Detect conflicting concepts/claims
   */
  static async process(
    nodes: Map<string, KnowledgeNode>,
    edges: Map<string, KnowledgeEdge[]>
  ): Promise<AgentProposal[]> {
    const proposals: AgentProposal[] = [];

    // Use reasoning engine to find contradictions
    const contradictions = ReasoningEngine.detectContradictions(nodes, edges);

    for (const contradiction of contradictions) {
      const proposal: AgentProposal = {
        id: uuidv4(),
        agent: 'ContradictionAgent',
        action: 'link',
        target: contradiction.nodeA,
        payload: {
          relation_type: contradiction.relation,
          target_node: contradiction.nodeB,
          evidence: 'Graph analysis detected conflicting relationship',
        },
        reasoning: `Concepts "${nodes.get(contradiction.nodeA)?.name}" and "${nodes.get(contradiction.nodeB)?.name}" have contradictory relationship: ${contradiction.relation}`,
        confidence: 0.85,
      };

      proposals.push(proposal);
    }

    console.log(`[Contradiction Agent] Found ${proposals.length} contradictions`);
    return proposals;
  }
}

export class CurriculumAgent {
  /**
   * Generate learning paths
   */
  static async process(
    startNodes: string[],
    targetNode: string,
    nodes: Map<string, KnowledgeNode>,
    edges: Map<string, KnowledgeEdge[]>
  ): Promise<AgentProposal[]> {
    const proposals: AgentProposal[] = [];
    const currentKnown = new Set(startNodes);

    // Generate curriculum for each target
    const curriculum = ReasoningEngine.generateCurriculum(
      currentKnown,
      nodes,
      edges,
      targetNode
    );

    if (curriculum.length > 0) {
      const proposal: AgentProposal = {
        id: uuidv4(),
        agent: 'CurriculumAgent',
        action: 'create',
        target: targetNode,
        payload: {
          learning_path: curriculum,
          current_knowledge: Array.from(currentKnown),
          target_concept: targetNode,
          steps: curriculum.length,
        },
        reasoning: `Generated ${curriculum.length}-step curriculum to reach "${nodes.get(targetNode)?.name}"`,
        confidence: 0.9,
      };

      proposals.push(proposal);
    }

    console.log(`[Curriculum Agent] Generated curriculum for ${startNodes.length} starting points`);
    return proposals;
  }
}

export class ResearchAgent {
  /**
   * Find knowledge gaps and low-confidence areas
   */
  static async process(
    nodes: Map<string, KnowledgeNode>
  ): Promise<AgentProposal[]> {
    const proposals: AgentProposal[] = [];
    const lowConfidenceThreshold = 0.5;
    const lowStrengthThreshold = 0.4;

    for (const [nodeId, node] of nodes.entries()) {
      // Find low-confidence nodes
      if (node.cognitive_state.confidence < lowConfidenceThreshold) {
        const proposal: AgentProposal = {
          id: uuidv4(),
          agent: 'ResearchAgent',
          action: 'update',
          target: nodeId,
          payload: {
            needs_research: true,
            current_confidence: node.cognitive_state.confidence,
            recommended_sources: ['research', 'papers', 'implementations'],
          },
          reasoning: `"${node.name}" has low confidence (${(node.cognitive_state.confidence * 100).toFixed(0)}%). Recommend additional research and citations.`,
          confidence: 0.8,
        };

        proposals.push(proposal);
      }

      // Find weak memory (rarely used)
      if (node.cognitive_state.strength < lowStrengthThreshold) {
        const proposal: AgentProposal = {
          id: uuidv4(),
          agent: 'ResearchAgent',
          action: 'update',
          target: nodeId,
          payload: {
            needs_reinforcement: true,
            current_strength: node.cognitive_state.strength,
            suggested_action: 'include_in_learning_path',
          },
          reasoning: `"${node.name}" has weak memory strength. Suggest reinforcing through exercises or applications.`,
          confidence: 0.75,
        };

        proposals.push(proposal);
      }
    }

    console.log(`[Research Agent] Identified ${proposals.length} areas needing research`);
    return proposals;
  }
}

/**
 * Consolidated agent runner
 */
export async function runAllAgents(
  chunks: any[],
  nodes: Map<string, KnowledgeNode>,
  edges: Map<string, KnowledgeEdge[]>,
  storage: any
): Promise<AgentProposal[]> {
  const allProposals: AgentProposal[] = [];

  console.log('[UAILS] Running agent orchestration...');

  // Run all agents
  const ingestionProposals = await IngestionAgent.process(chunks, nodes, storage);
  allProposals.push(...ingestionProposals);

  const alignmentProposals = await AlignmentAgent.process(nodes);
  allProposals.push(...alignmentProposals);

  const contradictionProposals = await ContradictionAgent.process(nodes, edges);
  allProposals.push(...contradictionProposals);

  const startNodes = Array.from(nodes.keys()).slice(0, 5);
  const targetNode = Array.from(nodes.keys())[0];
  const curriculumProposals = await CurriculumAgent.process(startNodes, targetNode, nodes, edges);
  allProposals.push(...curriculumProposals);

  const researchProposals = await ResearchAgent.process(nodes);
  allProposals.push(...researchProposals);

  console.log(`[UAILS] Total proposals: ${allProposals.length}`);
  return allProposals;
}
