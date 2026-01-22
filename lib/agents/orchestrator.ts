/**
 * Agent Orchestration Layer
 * Coordinates all 5 agents: Ingestion, Alignment, Contradiction, Curriculum, Research
 */

import { AgentProposal, AgentType, KnowledgeNode, KnowledgeEdge } from '@/lib/types';
import { IStorageAdapter } from '@/lib/storage/adapter';
import { getStorageAdapter } from '@/lib/storage/factory';
import { IngestionAgent } from './ingestion-agent';
import { AlignmentAgent } from './alignment-agent';
import { ContradictionAgent } from './contradiction-agent';
import { CurriculumAgent } from './curriculum-agent';
import { ResearchAgent } from './research-agent';

export interface AgentConfig {
  auto_approve_confidence: number; // Auto-approve proposals above this confidence
  log_proposals: boolean;
}

export class AgentOrchestrator {
  private storage: IStorageAdapter | null = null;
  private config: AgentConfig;

  // Agent instances
  private ingestionAgent: IngestionAgent | null = null;
  private alignmentAgent: AlignmentAgent | null = null;
  private contradictionAgent: ContradictionAgent | null = null;
  private curriculumAgent: CurriculumAgent | null = null;
  private researchAgent: ResearchAgent | null = null;

  // Proposal queue
  private proposals: Map<string, AgentProposal> = new Map();

  constructor(config: Partial<AgentConfig> = {}) {
    this.config = {
      auto_approve_confidence: config.auto_approve_confidence || 0.95,
      log_proposals: config.log_proposals !== false,
    };
  }

  /**
   * Initialize all agents
   */
  async initialize(): Promise<void> {
    this.storage = await getStorageAdapter();

    // Initialize all agents
    this.ingestionAgent = new IngestionAgent(this.storage);
    this.alignmentAgent = new AlignmentAgent(this.storage);
    this.contradictionAgent = new ContradictionAgent(this.storage);
    this.curriculumAgent = new CurriculumAgent(this.storage);
    this.researchAgent = new ResearchAgent(this.storage);

    console.log('[Orchestrator] All agents initialized');
  }

  private getStorage(): IStorageAdapter {
    if (!this.storage) throw new Error('AgentOrchestrator not initialized');
    return this.storage;
  }

  // ============================================================================
  // Agent Coordination
  // ============================================================================

  /**
   * Run the ingestion agent on new content
   */
  async runIngestionAgent(
    content: string,
    metadata: { title: string; source_url: string }
  ): Promise<AgentProposal[]> {
    if (!this.ingestionAgent) throw new Error('Ingestion agent not initialized');

    const proposals = await this.ingestionAgent.processDocument(content, metadata);

    for (const proposal of proposals) {
      this.proposals.set(proposal.id, proposal);
      if (this.config.log_proposals) {
        console.log(`[Orchestrator] Ingestion Agent proposed: ${proposal.action} (confidence: ${proposal.confidence})`);
      }

      // Auto-approve high-confidence proposals
      if (proposal.confidence >= this.config.auto_approve_confidence) {
        await this.approveProposal(proposal.id);
      }
    }

    return proposals;
  }

  /**
   * Run the alignment agent to normalize concepts
   */
  async runAlignmentAgent(): Promise<AgentProposal[]> {
    if (!this.alignmentAgent) throw new Error('Alignment agent not initialized');

    const proposals = await this.alignmentAgent.findDuplicatesAndNormalize();

    for (const proposal of proposals) {
      this.proposals.set(proposal.id, proposal);
      if (this.config.log_proposals) {
        console.log(
          `[Orchestrator] Alignment Agent proposed: ${proposal.action} (confidence: ${proposal.confidence})`
        );
      }
    }

    return proposals;
  }

  /**
   * Run the contradiction agent to detect conflicts
   */
  async runContradictionAgent(): Promise<AgentProposal[]> {
    if (!this.contradictionAgent) throw new Error('Contradiction agent not initialized');

    const proposals = await this.contradictionAgent.detectAndFlagConflicts();

    for (const proposal of proposals) {
      this.proposals.set(proposal.id, proposal);
      if (this.config.log_proposals) {
        console.log(`[Orchestrator] Contradiction Agent flagged: ${proposal.reasoning}`);
      }
    }

    return proposals;
  }

  /**
   * Run the curriculum agent to generate learning paths
   */
  async runCurriculumAgent(userKnownNodes: string[]): Promise<AgentProposal[]> {
    if (!this.curriculumAgent) throw new Error('Curriculum agent not initialized');

    const proposals = await this.curriculumAgent.generateLearningPaths(userKnownNodes);

    for (const proposal of proposals) {
      this.proposals.set(proposal.id, proposal);
      if (this.config.log_proposals) {
        console.log(`[Orchestrator] Curriculum Agent suggested: ${proposal.reasoning}`);
      }
    }

    return proposals;
  }

  /**
   * Run the research agent to find knowledge gaps
   */
  async runResearchAgent(): Promise<AgentProposal[]> {
    if (!this.researchAgent) throw new Error('Research agent not initialized');

    const proposals = await this.researchAgent.exploreKnowledgeGaps();

    for (const proposal of proposals) {
      this.proposals.set(proposal.id, proposal);
      if (this.config.log_proposals) {
        console.log(`[Orchestrator] Research Agent identified gap: ${proposal.reasoning}`);
      }
    }

    return proposals;
  }

  // ============================================================================
  // Proposal Management
  // ============================================================================

  /**
   * Get all pending proposals
   */
  getProposals(status: 'proposed' | 'approved' | 'rejected' = 'proposed'): AgentProposal[] {
    return Array.from(this.proposals.values()).filter(p => p.status === status);
  }

  /**
   * Approve a proposal and apply changes
   */
  async approveProposal(proposalId: string): Promise<void> {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) throw new Error(`Proposal ${proposalId} not found`);

    proposal.status = 'approved';

    // Apply the proposal
    await this.executeProposal(proposal);

    if (this.config.log_proposals) {
      console.log(`[Orchestrator] Approved: ${proposal.action}`);
    }
  }

  /**
   * Reject a proposal
   */
  rejectProposal(proposalId: string): void {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) throw new Error(`Proposal ${proposalId} not found`);

    proposal.status = 'rejected';

    if (this.config.log_proposals) {
      console.log(`[Orchestrator] Rejected: ${proposal.action}`);
    }
  }

  /**
   * Execute a proposal (apply changes to storage)
   */
  private async executeProposal(proposal: AgentProposal): Promise<void> {
    const storage = this.getStorage();

    switch (proposal.action) {
      case 'create_node':
        if (proposal.target && 'type' in proposal.target) {
          await storage.createNode(proposal.target as KnowledgeNode);
        }
        break;

      case 'update_node':
        if (proposal.target && 'id' in proposal.target) {
          const node = proposal.target as KnowledgeNode;
          await storage.updateNode(node.id, node);
        }
        break;

      case 'create_edge':
        if (proposal.target && 'relation' in proposal.target) {
          await storage.createEdge(proposal.target as KnowledgeEdge);
        }
        break;

      case 'update_edge':
        if (proposal.target && 'id' in proposal.target) {
          const edge = proposal.target as KnowledgeEdge;
          await storage.updateEdge(edge.id, edge);
        }
        break;

      case 'merge_nodes':
        // Merging is more complex - requires combining data
        if (proposal.target && 'node_a' in proposal.target) {
          const { node_a, node_b } = proposal.target as { node_a: string; node_b: string };
          console.log(`[Orchestrator] Would merge nodes ${node_a} and ${node_b}`);
        }
        break;

      case 'flag_conflict':
        // Flagging creates an edge with conflict marker
        if (proposal.target && 'node_a' in proposal.target) {
          const { node_a, node_b } = proposal.target as { node_a: string; node_b: string };
          const edge: KnowledgeEdge = {
            id: `conflict_${Date.now()}`,
            from_node: node_a,
            to_node: node_b,
            relation: 'competes_with',
            weight: { strength: 1.0, decay_rate: 0, reinforcement_rate: 0 },
            dynamics: { inhibitory: true, directional: false },
            temporal: { created_at: new Date(), last_used_at: new Date() },
            confidence: proposal.confidence,
            conflicting: true,
            created_at: new Date(),
            updated_at: new Date(),
          };
          await storage.createEdge(edge);
        }
        break;
    }
  }

  // ============================================================================
  // Full Workflow
  // ============================================================================

  /**
   * Run complete knowledge update workflow
   * Called periodically or on-demand to maintain graph integrity
   */
  async runFullWorkflow(): Promise<{ proposals: AgentProposal[]; approved: number }> {
    console.log('[Orchestrator] Starting full knowledge update workflow...');

    const allProposals: AgentProposal[] = [];

    // 1. Alignment: normalize existing concepts
    const alignmentProposals = await this.runAlignmentAgent();
    allProposals.push(...alignmentProposals);

    // 2. Contradiction: detect conflicts
    const contradictionProposals = await this.runContradictionAgent();
    allProposals.push(...contradictionProposals);

    // 3. Research: find gaps
    const researchProposals = await this.runResearchAgent();
    allProposals.push(...researchProposals);

    // Auto-approve high-confidence proposals
    let approved = 0;
    for (const proposal of allProposals) {
      if (proposal.confidence >= this.config.auto_approve_confidence) {
        await this.approveProposal(proposal.id);
        approved++;
      }
    }

    console.log(
      `[Orchestrator] Workflow complete: ${allProposals.length} proposals, ${approved} auto-approved`
    );

    return { proposals: allProposals, approved };
  }

  /**
   * Get workflow statistics
   */
  getStats(): {
    total_proposals: number;
    approved: number;
    pending: number;
    rejected: number;
  } {
    const allProposals = Array.from(this.proposals.values());
    return {
      total_proposals: allProposals.length,
      approved: allProposals.filter(p => p.status === 'approved').length,
      pending: allProposals.filter(p => p.status === 'proposed').length,
      rejected: allProposals.filter(p => p.status === 'rejected').length,
    };
  }
}

// Global singleton instance
let orchestratorInstance: AgentOrchestrator | null = null;

/**
 * Get the global agent orchestrator instance
 */
export async function getAgentOrchestrator(): Promise<AgentOrchestrator> {
  if (!orchestratorInstance) {
    orchestratorInstance = new AgentOrchestrator();
    await orchestratorInstance.initialize();
  }
  return orchestratorInstance;
}
