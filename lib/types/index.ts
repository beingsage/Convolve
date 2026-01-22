/**
 * UAILS Core Type Definitions
 * Unified Artificial Intelligence Language System
 */

// ============================================================================
// Node Types
// ============================================================================

export type NodeType = 
  | 'concept'
  | 'algorithm'
  | 'system'
  | 'api'
  | 'paper'
  | 'tool'
  | 'failure_mode'
  | 'optimization'
  | 'abstraction';

export type RelationType =
  | 'depends_on'
  | 'abstracts'
  | 'implements'
  | 'replaces'
  | 'suppresses'
  | 'interferes_with'
  | 'requires_for_debugging'
  | 'optimizes'
  | 'causes_failure_in'
  | 'uses'
  | 'improves'
  | 'generalizes'
  | 'specializes'
  | 'requires'
  | 'fails_on'
  | 'introduced_in'
  | 'evaluated_on'
  | 'competes_with'
  | 'derived_from';

export type SourceTier = 'T1' | 'T2' | 'T3' | 'T4';

export type AbstractionLevel = 'theory' | 'math' | 'intuition' | 'code';

export interface LevelMetrics {
  abstraction: number; // [0..1] math → system → product
  difficulty: number;  // [0..1]
  volatility: number;  // [0..1] how fast becomes obsolete
}

export interface CognitiveState {
  strength: number;       // memory strength [0..1]
  activation: number;     // current reasoning activation [0..1]
  decay_rate: number;     // forgetting speed
  confidence: number;     // correctness confidence [0..1]
}

export interface TemporalMetadata {
  introduced_at: Date;
  last_reinforced_at: Date;
  peak_relevance_at: Date;
}

export interface RealWorldMetrics {
  used_in_production: boolean;
  companies_using: number;
  avg_salary_weight: number; // [0..1] correlation with salary
  interview_frequency: number; // [0..1]
}

export interface Grounding {
  source_refs: string[];      // paper_id, doc_url
  implementation_refs: string[]; // repo_url
}

export interface FailureSurface {
  common_bugs: string[];    // node_ids
  misconceptions: string[]; // node_ids
}

export interface KnowledgeNode {
  id: string;
  type: NodeType;
  name: string;
  description: string; // LLM-readable, not textbook
  
  level: LevelMetrics;
  cognitive_state: CognitiveState;
  temporal: TemporalMetadata;
  real_world: RealWorldMetrics;
  grounding: Grounding;
  failure_surface: FailureSurface;
  
  // Metadata
  created_at: Date;
  updated_at: Date;
  canonical_name?: string;
  first_appearance_year?: number;
  domain?: string;
}

// ============================================================================
// Edge Types
// ============================================================================

export interface EdgeWeight {
  strength: number;           // importance [0..1]
  decay_rate: number;
  reinforcement_rate: number;
}

export interface EdgeDynamics {
  inhibitory: boolean;        // suppress activation?
  directional: boolean;
}

export interface EdgeTemporal {
  created_at: Date;
  last_used_at: Date;
}

export interface KnowledgeEdge {
  id: string;
  from_node: string;
  to_node: string;
  relation: RelationType;
  
  weight: EdgeWeight;
  dynamics: EdgeDynamics;
  temporal: EdgeTemporal;
  
  // Metadata
  created_at: Date;
  updated_at: Date;
  confidence: number; // [0..1]
  conflicting?: boolean; // marks COMPETES_WITH or FAILS_ON
}

// ============================================================================
// Vector/Embedding Types
// ============================================================================

export type EmbeddingType =
  | 'concept_embedding'
  | 'method_explanation'
  | 'paper_claim'
  | 'failure_case'
  | 'code_pattern'
  | 'comparison';

export interface VectorPayload {
  id: string;
  embedding: number[]; // actual vector data
  embedding_type: EmbeddingType;
  collection: string;
  
  entity_refs: string[];        // IDs of graph nodes
  confidence: number;           // [0..1]
  abstraction_level: AbstractionLevel;
  source_tier: SourceTier;
  
  created_at: Date;
  updated_at: Date;
  decay_score?: number;         // for temporal decay
}

// ============================================================================
// Document/Chunk Types
// ============================================================================

export type ClaimType = 'definition' | 'method' | 'result' | 'limitation' | 'unknown';

export interface DocumentChunk {
  id: string;
  content: string;
  source_id: string;        // paper_id or doc_url
  section: string;
  claim_type: ClaimType;
  
  extracted_concepts: string[]; // node ids
  embedding_id?: string;
  confidence: number; // [0..1]
  
  created_at: Date;
}

export interface Document {
  id: string;
  title: string;
  source_url: string;
  source_tier: SourceTier;
  content: string;
  
  metadata: Record<string, unknown>;
  chunks?: DocumentChunk[];
  
  created_at: Date;
  processed_at?: Date;
}

// ============================================================================
// Query & Response Types
// ============================================================================

export interface SemanticQuery {
  query: string;
  limit?: number;
  filters?: {
    node_types?: NodeType[];
    difficulty_range?: [number, number];
    abstraction_range?: [number, number];
    source_tiers?: SourceTier[];
  };
  context?: string; // user background context (e.g., "I know calculus")
}

export interface ConceptPath {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
  reasoning: string;
}

export interface ConceptComparison {
  concept_a: KnowledgeNode;
  concept_b: KnowledgeNode;
  similarities: string[];
  differences: string[];
  when_to_use_a: string;
  when_to_use_b: string;
}

export interface SkillMetrics {
  node_id: string;
  node_name: string;
  mastery_level: number; // [0..1]
  frequency: number;      // access frequency
  reinforcement_count: number;
  decay_factor: number;
}

export interface LearningPath {
  user_known: string[]; // node ids
  recommended_next: {
    node: KnowledgeNode;
    reason: string;
    prerequisite_gap?: KnowledgeNode[];
  }[];
  mastery_estimate: number; // [0..1]
}

// ============================================================================
// Agent Types
// ============================================================================

export type AgentType = 'ingestion' | 'alignment' | 'contradiction' | 'curriculum' | 'research';

export interface AgentProposal {
  id: string;
  agent_type: AgentType;
  action: 'create_node' | 'update_node' | 'create_edge' | 'update_edge' | 'merge_nodes' | 'flag_conflict';
  target: KnowledgeNode | KnowledgeEdge | { node_a: string; node_b: string };
  reasoning: string;
  confidence: number;
  created_at: Date;
  status: 'proposed' | 'approved' | 'rejected';
}

export interface AgentContext {
  storage: any; // StorageAdapter
  query_engine: any; // SemanticQueryEngine
  config: any; // UAILS config
}

// ============================================================================
// Memory Decay Types
// ============================================================================

export interface DecayConfig {
  base_lambda: number;           // base decay rate
  reinforcement_boost: number;   // strength increase on access
  citation_weight: number;       // how citations slow decay
  foundational_bonus: number;    // slower decay for foundational concepts
}

export interface DecayState {
  node_id: string;
  last_decay_calc: Date;
  current_strength: number;
}

// ============================================================================
// Configuration Types
// ============================================================================

export type StorageType = 'mongodb' | 'neo4j' | 'qdrant' | 'postgres' | 'memory';

export interface StorageConfig {
  type: StorageType;
  connection_string?: string;
  credentials?: {
    username?: string;
    password?: string;
  };
  options?: Record<string, unknown>;
}

export interface UAILSConfig {
  storage: StorageConfig;
  embedding_model: {
    provider: string; // 'openai', 'local', etc
    model_name: string;
    dimension: number;
  };
  decay: DecayConfig;
  feature_flags?: {
    enable_vector_search?: boolean;
    enable_graph_reasoning?: boolean;
    auto_concept_extraction?: boolean;
  };
}

// ============================================================================
// API Response Types
// ============================================================================

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}
