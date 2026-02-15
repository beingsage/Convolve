# Design Document

## Overview

UAILS (Unified Artificial Intelligence Language System) is architected as a multi-layered knowledge management system that treats concepts as dynamic cognitive entities. The design emphasizes modularity through storage abstraction, autonomous agent coordination, and hybrid database architecture combining vector search (Qdrant) with graph traversal (Neo4j).

The system follows a clean architecture pattern with clear separation between:
- **Data Layer**: Type-safe entities and storage abstraction
- **Service Layer**: Business logic for ingestion, decay, and querying
- **Agent Layer**: Autonomous services for knowledge maintenance
- **API Layer**: RESTful endpoints for external access
- **Frontend Layer**: React-based user interfaces
- **Workflow Layer**: Python LangGraph for complex orchestration

## Architecture

### System Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Layer (React 19)                │
│         /query | /graph | /skills | /paths                  │
└────────────┬────────────────────────────────────────────────┘
             │ HTTP/REST
┌────────────▼────────────────────────────────────────────────┐
│                  API Layer (Next.js Routes)                 │
│    /api/query | /api/nodes | /api/agents | /api/workflows  │
└────────────┬────────────────────────────────────────────────┘
             │
┌────────────▼────────────────────────────────────────────────┐
│                    Service Layer                            │
│  SemanticQuery | KnowledgeGraph | MemoryDecay | Ingestion  │
└────────────┬────────────────────────────────────────────────┘
             │
┌────────────▼────────────────────────────────────────────────┐
│                    Agent Layer                              │
│  Orchestrator → [Ingestion, Alignment, Contradiction,      │
│                  Curriculum, Research]                      │
└────────────┬────────────────────────────────────────────────┘
             │
┌────────────▼────────────────────────────────────────────────┐
│              Storage Adapter (IStorageAdapter)              │
│  Factory Pattern → [Memory, MongoDB, Neo4j, Qdrant, Hybrid] │
└────────────┬────────────────────────────────────────────────┘
             │
┌────────────▼────────────────────────────────────────────────┐
│                  Physical Storage                           │
│  Qdrant (Vectors) | Neo4j (Graph) | MongoDB (Documents)    │
└─────────────────────────────────────────────────────────────┘
```

### Hybrid Storage Architecture


The hybrid storage approach optimizes for different access patterns:

```
HybridAdapter
├── Neo4j (Graph Operations)
│   ├── Node CRUD
│   ├── Edge CRUD
│   ├── Path finding (BFS)
│   └── Multi-hop traversal
│
└── Qdrant (Vector Operations)
    ├── Embedding storage
    ├── Similarity search
    ├── Filtered queries
    └── Decay score updates
```

**Design Rationale:**
- Neo4j excels at relationship traversal and pattern matching
- Qdrant excels at high-dimensional vector similarity
- Combining both provides optimal performance for knowledge graphs with semantic search
- Adapter pattern allows switching to single-backend deployments

## Components and Interfaces

### 1. Storage Adapter Layer

**Interface: IStorageAdapter**

```typescript
interface IStorageAdapter {
  // Lifecycle
  initialize(): Promise<void>
  healthCheck(): Promise<boolean>
  disconnect(): Promise<void>
  
  // Node Operations
  createNode(node: KnowledgeNode): Promise<KnowledgeNode>
  getNode(id: string): Promise<KnowledgeNode | null>
  searchNodes(query: string, limit?: number): Promise<KnowledgeNode[]>
  updateNode(id: string, updates: Partial<KnowledgeNode>): Promise<KnowledgeNode>
  deleteNode(id: string): Promise<boolean>
  listNodes(page: number, limit: number): Promise<PaginatedResponse<KnowledgeNode>>
  
  // Edge Operations
  createEdge(edge: KnowledgeEdge): Promise<KnowledgeEdge>
  getEdgesFrom(nodeId: string): Promise<KnowledgeEdge[]>
  getPath(fromId: string, toId: string, maxDepth: number): Promise<KnowledgeEdge[]>
  
  // Vector Operations
  storeVector(vector: VectorPayload): Promise<VectorPayload>
  searchVectors(embedding: number[], limit?: number): Promise<VectorPayload[]>
  
  // Bulk Operations
  bulkCreateNodes(nodes: KnowledgeNode[]): Promise<KnowledgeNode[]>
  bulkCreateEdges(edges: KnowledgeEdge[]): Promise<KnowledgeEdge[]>
}
```

**Implementation Strategy:**
- Factory pattern creates appropriate adapter based on STORAGE_TYPE env var
- Singleton pattern ensures single global instance
- Each adapter implements full interface or throws NotImplementedError
- Hybrid adapter delegates to specialized adapters


### 2. Knowledge Graph Service

**Responsibilities:**
- Create nodes and edges with full metadata
- Find paths between concepts using BFS
- Compare concepts (similarities/differences)
- Detect prerequisites via depends_on traversal
- Identify conflicts via competes_with edges

**Key Methods:**

```typescript
class KnowledgeGraphService {
  async createConcept(data: Partial<KnowledgeNode>): Promise<KnowledgeNode>
  async createRelationship(from: string, to: string, relation: RelationType): Promise<KnowledgeEdge>
  async findPath(fromId: string, toId: string, maxHops: number): Promise<ConceptPath>
  async compareConcepts(idA: string, idB: string): Promise<ConceptComparison>
  async getPrerequisites(nodeId: string): Promise<KnowledgeNode[]>
  async detectConflicts(): Promise<KnowledgeEdge[]>
}
```

**Path Finding Algorithm:**
```
BFS(start, end, maxDepth):
  queue = [(start, [start], 0)]
  visited = {start}
  
  while queue not empty:
    (current, path, depth) = queue.pop()
    
    if current == end:
      return path
    
    if depth >= maxDepth:
      continue
    
    for edge in getEdgesFrom(current):
      neighbor = edge.to_node
      if neighbor not in visited:
        visited.add(neighbor)
        queue.append((neighbor, path + [neighbor], depth + 1))
  
  return null  // No path found
```

### 3. Memory Decay Service

**Decay Formula:**
```
strength(t) = strength(t-1) * e^(-λΔt) + reinforcement

where:
  λ = base_lambda * (1 - citation_weight * citation_count) * (1 - foundational_bonus * is_foundational)
  Δt = time since last reinforcement
  reinforcement = reinforcement_boost (when accessed)
```

**Configuration:**
```typescript
interface DecayConfig {
  base_lambda: 0.693 / (30 * 24 * 60 * 60 * 1000)  // 30-day half-life
  reinforcement_boost: 0.1                          // 10% strength increase
  citation_weight: 0.05                             // 5% decay reduction per citation
  foundational_bonus: 0.5                           // 50% slower decay for foundational
}
```

**Decay Calculation Process:**
```
DecayManager.calculateDecay():
  1. Check if hourly interval has passed
  2. If yes:
     a. Fetch all nodes from storage
     b. For each node:
        - Calculate time delta since last_reinforced_at
        - Apply decay formula
        - Update cognitive_state.strength
        - Update cognitive_state.decay_rate
        - Save updated node
     c. Identify frequently co-activated vectors
     d. Consolidate related vectors into higher-level representations
```


### 4. Semantic Query Engine

**Query Processing Pipeline:**
```
User Query
  ↓
Parse query string and filters
  ↓
Apply node_types filter
  ↓
Apply difficulty_range filter
  ↓
Apply abstraction_range filter
  ↓
Apply source_tiers filter
  ↓
Keyword search on name/description
  ↓
Rank by relevance score
  ↓
Generate personalized explanation (if context provided)
  ↓
Return results
```

**Relevance Scoring:**
```typescript
function calculateRelevance(node: KnowledgeNode, query: string): number {
  let score = 0
  
  // Exact name match
  if (node.name.toLowerCase() === query.toLowerCase()) {
    score += 10
  }
  
  // Name contains query
  if (node.name.toLowerCase().includes(query.toLowerCase())) {
    score += 5
  }
  
  // Description contains query
  if (node.description.toLowerCase().includes(query.toLowerCase())) {
    score += 2
  }
  
  // Boost by cognitive strength
  score *= node.cognitive_state.strength
  
  // Boost by confidence
  score *= node.cognitive_state.confidence
  
  return score
}
```

**Personalization Strategy:**
When user provides context (e.g., "I know calculus"), the system:
1. Identifies known concepts from context
2. Adjusts explanation complexity based on prerequisites
3. Highlights connections to known concepts
4. Skips basic definitions if prerequisites are satisfied

### 5. Ingestion Pipeline

**Document Processing Flow:**
```
Raw Document
  ↓
1. Parse Format (remove HTML/Markdown)
  ↓
2. Chunk Content (512 chars, 100 overlap)
  ↓
3. Extract Claims (definition/method/result/limitation)
  ↓
4. Extract Concepts (keyword matching)
  ↓
5. Tag Chunks (link concepts to chunks)
  ↓
6. Store Chunks in DB
  ↓
7. Generate Agent Proposals for new concepts
```

**Chunking Algorithm:**
```typescript
function chunkDocument(content: string): DocumentChunk[] {
  const CHUNK_SIZE = 512
  const OVERLAP = 100
  const chunks: DocumentChunk[] = []
  
  let start = 0
  while (start < content.length) {
    const end = Math.min(start + CHUNK_SIZE, content.length)
    const chunkContent = content.substring(start, end)
    
    chunks.push({
      id: generateId(),
      content: chunkContent,
      source_id: documentId,
      section: detectSection(chunkContent),
      claim_type: classifyClaim(chunkContent),
      extracted_concepts: extractConcepts(chunkContent),
      confidence: 0.8,
      created_at: new Date()
    })
    
    start += (CHUNK_SIZE - OVERLAP)
  }
  
  return chunks
}
```

**Concept Extraction:**
Uses keyword matching against known concept names. Future enhancement: use LLM for extraction.


### 6. Agent System Architecture

**Agent Orchestrator:**
Central coordinator managing all 5 agents and their proposals.

```typescript
class AgentOrchestrator {
  private proposals: Map<string, AgentProposal>
  private agents: {
    ingestion: IngestionAgent
    alignment: AlignmentAgent
    contradiction: ContradictionAgent
    curriculum: CurriculumAgent
    research: ResearchAgent
  }
  
  async runIngestionAgent(content, metadata): Promise<AgentProposal[]>
  async runAlignmentAgent(): Promise<AgentProposal[]>
  async runContradictionAgent(): Promise<AgentProposal[]>
  async runCurriculumAgent(knownNodes): Promise<AgentProposal[]>
  async runResearchAgent(): Promise<AgentProposal[]>
  
  async approveProposal(id: string): Promise<void>
  rejectProposal(id: string): void
  getProposals(status: 'proposed' | 'approved' | 'rejected'): AgentProposal[]
  
  async runFullWorkflow(): Promise<{ proposals, approved }>
}
```

**Agent 1: Ingestion Agent**
```
Input: Document content + metadata
Process:
  1. Run ingestion pipeline
  2. For each extracted concept:
     - Check if concept already exists
     - If new, create AgentProposal with action='create_node'
     - Set confidence based on extraction quality (0.75-0.85)
  3. Return all proposals
Output: AgentProposal[]
```

**Agent 2: Alignment Agent**
```
Input: None (operates on existing graph)
Process:
  1. Fetch all nodes
  2. For each pair of nodes:
     - Calculate Levenshtein distance
     - If similarity > threshold (e.g., 0.85):
       - Create AgentProposal with action='merge_nodes'
       - Set confidence based on similarity score
  3. Return merge proposals
Output: AgentProposal[]
```

**Levenshtein Distance:**
```typescript
function levenshtein(a: string, b: string): number {
  const matrix = Array(b.length + 1).fill(null).map(() => 
    Array(a.length + 1).fill(null))
  
  for (let i = 0; i <= a.length; i++) matrix[0][i] = i
  for (let j = 0; j <= b.length; j++) matrix[j][0] = j
  
  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + cost
      )
    }
  }
  
  return matrix[b.length][a.length]
}

function similarity(a: string, b: string): number {
  const distance = levenshtein(a.toLowerCase(), b.toLowerCase())
  const maxLength = Math.max(a.length, b.length)
  return 1 - (distance / maxLength)
}
```

**Agent 3: Contradiction Agent**
```
Input: None (operates on existing graph)
Process:
  1. Fetch all edges
  2. Identify edges with relation='competes_with' or 'fails_on'
  3. For each conflict edge:
     - If not already flagged:
       - Create AgentProposal with action='flag_conflict'
       - Set confidence based on edge strength (0.70-0.90)
  4. Return conflict proposals
Output: AgentProposal[]
```


**Agent 4: Curriculum Agent**
```
Input: user_known_nodes (array of node IDs)
Process:
  1. Fetch all nodes
  2. For each unknown node:
     - Traverse depends_on edges to find prerequisites
     - Check if prerequisites are in user_known_nodes
     - If prerequisites satisfied:
       - Add to recommended_next with high priority
     - If prerequisites missing:
       - Add to prerequisite_gap
  3. Sort recommendations by difficulty
  4. Calculate mastery_estimate = known_nodes.length / total_nodes.length
  5. Return LearningPath
Output: LearningPath
```

**Agent 5: Research Agent**
```
Input: None (operates on existing graph)
Process:
  1. Fetch all nodes
  2. Identify low-confidence nodes (confidence < 0.70)
  3. Identify isolated nodes (few edges)
  4. For each gap:
     - Create AgentProposal with reasoning
     - Set confidence 0.60-0.70
  5. Return gap proposals
Output: AgentProposal[]
```

**Proposal Execution:**
```typescript
async function executeProposal(proposal: AgentProposal): Promise<void> {
  switch (proposal.action) {
    case 'create_node':
      await storage.createNode(proposal.target as KnowledgeNode)
      break
    
    case 'update_node':
      const node = proposal.target as KnowledgeNode
      await storage.updateNode(node.id, node)
      break
    
    case 'create_edge':
      await storage.createEdge(proposal.target as KnowledgeEdge)
      break
    
    case 'merge_nodes':
      const { node_a, node_b } = proposal.target
      // Combine metadata from both nodes
      // Redirect all edges to merged node
      // Delete redundant node
      break
    
    case 'flag_conflict':
      const { node_a, node_b } = proposal.target
      await storage.createEdge({
        from_node: node_a,
        to_node: node_b,
        relation: 'competes_with',
        conflicting: true,
        // ... other fields
      })
      break
  }
}
```

## Data Models

### KnowledgeNode

```typescript
interface KnowledgeNode {
  // Identity
  id: string                    // UUID
  type: NodeType                // concept | algorithm | system | api | paper | tool | failure_mode
  name: string                  // Human-readable name
  description: string           // LLM-readable explanation
  
  // Levels
  level: {
    abstraction: number         // [0..1] theory → implementation
    difficulty: number          // [0..1] beginner → expert
    volatility: number          // [0..1] stable → rapidly changing
  }
  
  // Cognitive State
  cognitive_state: {
    strength: number            // [0..1] memory strength
    activation: number          // [0..1] current activation level
    decay_rate: number          // forgetting speed
    confidence: number          // [0..1] correctness confidence
  }
  
  // Temporal
  temporal: {
    introduced_at: Date         // When concept was first introduced
    last_reinforced_at: Date    // Last access time
    peak_relevance_at: Date     // When concept was most relevant
  }
  
  // Real-World
  real_world: {
    used_in_production: boolean
    companies_using: number
    avg_salary_weight: number   // [0..1] correlation with salary
    interview_frequency: number // [0..1] how often appears in interviews
  }
  
  // Grounding
  grounding: {
    source_refs: string[]       // URLs to papers, docs
    implementation_refs: string[] // URLs to code repos
  }
  
  // Failure Surface
  failure_surface: {
    common_bugs: string[]       // Node IDs of common bugs
    misconceptions: string[]    // Node IDs of misconceptions
  }
  
  // Metadata
  created_at: Date
  updated_at: Date
  canonical_name?: string
  first_appearance_year?: number
  domain?: string
}
```


### KnowledgeEdge

```typescript
interface KnowledgeEdge {
  // Identity
  id: string
  from_node: string             // Source node ID
  to_node: string               // Target node ID
  relation: RelationType        // Type of relationship
  
  // Weight
  weight: {
    strength: number            // [0..1] importance
    decay_rate: number          // how fast relationship weakens
    reinforcement_rate: number  // how fast it strengthens on use
  }
  
  // Dynamics
  dynamics: {
    inhibitory: boolean         // Does this suppress activation?
    directional: boolean        // Is this one-way?
  }
  
  // Temporal
  temporal: {
    created_at: Date
    last_used_at: Date
  }
  
  // Metadata
  created_at: Date
  updated_at: Date
  confidence: number            // [0..1]
  conflicting?: boolean         // Marks conflicts
}
```

**Relation Types:**
- `depends_on`: A requires B to understand
- `abstracts`: A is higher-level than B
- `implements`: A is concrete implementation of B
- `replaces`: A supersedes B
- `suppresses`: A makes B less relevant
- `interferes_with`: A and B conflict
- `requires_for_debugging`: Need A to debug B
- `optimizes`: A improves performance of B
- `causes_failure_in`: A causes bugs in B
- `uses`: A utilizes B
- `improves`: A enhances B
- `generalizes`: A is broader than B
- `specializes`: A is narrower than B
- `requires`: A needs B
- `fails_on`: A doesn't work with B
- `introduced_in`: A was introduced in paper/system B
- `evaluated_on`: A was tested on B
- `competes_with`: A and B are alternatives
- `derived_from`: A comes from B

### VectorPayload

```typescript
interface VectorPayload {
  id: string
  embedding: number[]           // High-dimensional vector
  embedding_type: EmbeddingType // concept_embedding | method_explanation | etc
  collection: string            // Logical grouping
  
  entity_refs: string[]         // Node IDs this vector represents
  confidence: number            // [0..1]
  abstraction_level: AbstractionLevel // theory | math | intuition | code
  source_tier: SourceTier       // T1 | T2 | T3 | T4
  
  created_at: Date
  updated_at: Date
  decay_score?: number          // For temporal decay
}
```

### AgentProposal

```typescript
interface AgentProposal {
  id: string
  agent_type: AgentType         // ingestion | alignment | contradiction | curriculum | research
  action: 'create_node' | 'update_node' | 'create_edge' | 'update_edge' | 'merge_nodes' | 'flag_conflict'
  target: KnowledgeNode | KnowledgeEdge | { node_a: string; node_b: string }
  reasoning: string             // Why this proposal was made
  confidence: number            // [0..1]
  created_at: Date
  status: 'proposed' | 'approved' | 'rejected'
}
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After analyzing all acceptance criteria, I identified the following key property categories:

1. **Structural Properties**: Node and edge creation must satisfy schema constraints
2. **Round-Trip Properties**: Create → Retrieve → should return equivalent data
3. **Invariant Properties**: IDs remain constant, timestamps update correctly
4. **Filtering Properties**: Filtered queries return only matching items
5. **Mathematical Properties**: Decay formula produces correct values
6. **Agent Behavior Properties**: Agents generate valid proposals
7. **API Contract Properties**: Endpoints return correct response formats

Many individual acceptance criteria can be combined into comprehensive properties. For example, requirements 1.1-1.7 about node structure can be tested with a single property that validates all required fields are present and correctly typed.

### Core Properties

**Property 1: Node Creation Completeness**
*For any* valid node data, when creating a node, the stored node should contain all required fields: identity (id, type, name, description), level metrics (abstraction, difficulty, volatility in [0,1]), cognitive_state (strength, activation, decay_rate, confidence), temporal metadata, real_world metrics, grounding, and failure_surface.
**Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7**

**Property 2: Node Round-Trip Consistency**
*For any* valid knowledge node, creating the node and then retrieving it by ID should return a node equivalent to the original (ignoring generated fields like timestamps).
**Validates: Requirements 1.9**

**Property 3: Node Type Validation**
*For any* node creation attempt, the system should accept only valid node types (concept, algorithm, system, api, paper, tool, failure_mode, optimization, abstraction) and reject invalid types.
**Validates: Requirements 1.8**

**Property 4: Node Search Relevance**
*For any* search query and node dataset, all returned nodes should contain the search term in either name or description.
**Validates: Requirements 1.10**

**Property 5: Node Type Filtering**
*For any* node type filter and node dataset, all returned nodes should have exactly that node type.
**Validates: Requirements 1.11**

**Property 6: Node Update ID Invariance**
*For any* node update operation, the node ID should remain unchanged and the updated_at timestamp should be greater than the original.
**Validates: Requirements 1.12**

**Property 7: Node Deletion Completeness**
*For any* node, after deletion, attempting to retrieve that node by ID should return null.
**Validates: Requirements 1.13**


**Property 8: Edge Creation Completeness**
*For any* valid edge data, when creating an edge, the stored edge should contain all required fields: from_node, to_node, relation (one of 19 valid types), weight, dynamics, temporal metadata, and confidence.
**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**

**Property 9: Edge Query Consistency**
*For any* edge between nodes A and B, querying edges from A should include this edge, and querying edges to B should include this edge.
**Validates: Requirements 2.6, 2.7**

**Property 10: Path Finding Validity**
*For any* path found between two nodes, every consecutive pair of nodes in the path should be connected by an edge, and the path length should not exceed the specified max depth.
**Validates: Requirements 2.12**

**Property 11: Storage Adapter Interface Compliance**
*For any* storage adapter implementation, it should provide all required methods from IStorageAdapter interface or throw NotImplementedError.
**Validates: Requirements 3.1, 3.7**

**Property 12: Storage Type Switching**
*For any* valid STORAGE_TYPE environment variable, the factory should return an adapter instance without requiring code changes.
**Validates: Requirements 3.3, 3.10**

**Property 13: Vector Similarity Search Ordering**
*For any* vector similarity search, results should be ordered by descending cosine similarity score.
**Validates: Requirements 4.5, 4.7**

**Property 14: Vector Filtering**
*For any* vector search with metadata filters, all returned vectors should satisfy the filter conditions.
**Validates: Requirements 4.6**

**Property 15: Document Chunking Overlap**
*For any* document, consecutive chunks should have exactly OVERLAP characters of overlap (except at document boundaries).
**Validates: Requirements 5.2**

**Property 16: Chunk Concept Linking**
*For any* ingested document, all chunks should have extracted_concepts array linking to valid node IDs.
**Validates: Requirements 5.6**

**Property 17: Memory Decay Formula Correctness**
*For any* node with known initial strength, time delta, and decay parameters, the calculated strength should equal: strength(0) * e^(-λΔt) + reinforcement (within floating-point tolerance).
**Validates: Requirements 6.1**

**Property 18: Decay Strength Bounds**
*For any* node after decay calculation, the cognitive_state.strength should remain in the range [0, 1].
**Validates: Requirements 6.2, 6.3**

**Property 19: Query Filter Application**
*For any* semantic query with filters, all returned nodes should satisfy all specified filter conditions (node_types, difficulty_range, abstraction_range, source_tiers).
**Validates: Requirements 7.2**

**Property 20: Ingestion Proposal Generation**
*For any* document ingestion, the agent should generate proposals only for concepts not already in the knowledge graph.
**Validates: Requirements 8.2, 8.3**


**Property 21: Alignment Similarity Threshold**
*For any* two nodes proposed for merging by the alignment agent, their name similarity score should exceed the configured threshold.
**Validates: Requirements 9.2, 9.3**

**Property 22: Contradiction Detection**
*For any* edge with relation type 'competes_with' or 'fails_on', the contradiction agent should flag it with conflicting=true.
**Validates: Requirements 10.2, 10.3**

**Property 23: Curriculum Prerequisite Satisfaction**
*For any* recommended concept in a learning path, either all its prerequisites should be in the user's known nodes, or the prerequisites should be listed in prerequisite_gap.
**Validates: Requirements 11.2, 11.3, 11.4**

**Property 24: Research Gap Identification**
*For any* node identified as a knowledge gap, it should have either confidence < 0.70 or fewer edges than the isolation threshold.
**Validates: Requirements 12.2, 12.3**

**Property 25: Proposal Auto-Approval**
*For any* agent proposal with confidence >= auto_approve_confidence, the orchestrator should automatically approve and execute it.
**Validates: Requirements 13.3, 13.4**

**Property 26: Proposal Execution Correctness**
*For any* approved proposal, after execution, the storage should reflect the proposed change (node created/updated, edge created, etc.).
**Validates: Requirements 13.5, 13.6, 13.7, 13.8, 13.9**

**Property 27: API Response Format**
*For any* API endpoint call, the response should be valid JSON with fields: success (boolean), data (if success=true), error (if success=false), and timestamp (ISO8601).
**Validates: Requirements 14.13, 14.14, 14.15**

**Property 28: API Pagination**
*For any* paginated API endpoint, the response should include items array, total count, page number, limit, and has_more flag.
**Validates: Requirements 14.4, 20.7, 20.8**

**Property 29: Hybrid Storage Delegation**
*For any* hybrid storage operation, node/edge operations should use Neo4j and vector operations should use Qdrant.
**Validates: Requirements 18.2, 18.3, 18.4, 18.5, 18.6**

**Property 30: Configuration Environment Variables**
*For any* required configuration variable, if not set in environment, the system should use documented default values.
**Validates: Requirements 19.11**

**Property 31: Bulk Operation Atomicity**
*For any* bulk create operation, either all items should be created successfully, or the operation should return a list of successes and failures.
**Validates: Requirements 20.3, 20.4, 20.5**

**Property 32: Transaction Rollback**
*For any* transaction that is rolled back, none of the buffered operations should be persisted to storage.
**Validates: Requirements 20.11**


## Error Handling

### Error Categories

**1. Validation Errors**
- Invalid node type
- Metrics out of range [0,1]
- Missing required fields
- Invalid relation type

**Strategy:** Throw descriptive ValidationError before attempting storage operation.

**2. Not Found Errors**
- Node ID doesn't exist
- Edge ID doesn't exist
- Vector ID doesn't exist

**Strategy:** Return null or empty array (not an error). Allows graceful handling.

**3. Storage Errors**
- Connection failure
- Query timeout
- Insufficient permissions

**Strategy:** Throw StorageError with original error context. Log error details.

**4. Agent Errors**
- Proposal execution failure
- Agent initialization failure

**Strategy:** Log error, continue orchestrator operation. Don't crash entire system.

**5. API Errors**
- Invalid request format
- Missing parameters
- Unauthorized access (future)

**Strategy:** Return JSON with success=false and descriptive error message. HTTP status codes.

### Error Response Format

```typescript
interface ErrorResponse {
  success: false
  error: string              // Human-readable message
  code?: string              // Machine-readable error code
  details?: any              // Additional context
  timestamp: string          // ISO8601
}
```

### Logging Strategy

**Development:**
- Log all operations (verbose)
- Log all agent proposals
- Log all storage operations
- Log all API requests

**Production:**
- Log errors only
- Log agent proposals (configurable)
- Log critical operations
- Minimize verbose logging

## Testing Strategy

### Unit Testing

**Target:** Individual functions and methods

**Coverage:**
- Storage adapter methods (CRUD operations)
- Decay calculation functions
- Similarity scoring functions
- Chunking algorithms
- Path finding algorithms
- Relevance scoring

**Framework:** Jest or Vitest

**Example:**
```typescript
describe('Memory Decay', () => {
  it('should calculate decay correctly', () => {
    const initial = 1.0
    const lambda = 0.693 / (30 * 24 * 60 * 60 * 1000)
    const delta = 15 * 24 * 60 * 60 * 1000  // 15 days
    const expected = initial * Math.exp(-lambda * delta)
    
    const result = calculateDecay(initial, lambda, delta, 0)
    expect(result).toBeCloseTo(expected, 5)
  })
})
```

### Property-Based Testing

**Target:** Universal properties across all inputs

**Framework:** fast-check (TypeScript property testing library)

**Configuration:** Minimum 100 iterations per property test

**Test Tagging:** Each test must reference design property
```typescript
// Feature: uails-complete-system, Property 2: Node Round-Trip Consistency
```

**Key Properties to Test:**
- Property 2: Node round-trip consistency
- Property 7: Node deletion completeness
- Property 10: Path finding validity
- Property 17: Memory decay formula correctness
- Property 19: Query filter application
- Property 27: API response format
- Property 32: Transaction rollback

**Example:**
```typescript
import fc from 'fast-check'

// Feature: uails-complete-system, Property 2: Node Round-Trip Consistency
describe('Node Round-Trip', () => {
  it('should preserve node data through create-retrieve cycle', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryKnowledgeNode(),
        async (node) => {
          const created = await storage.createNode(node)
          const retrieved = await storage.getNode(created.id)
          
          expect(retrieved).not.toBeNull()
          expect(retrieved!.name).toBe(node.name)
          expect(retrieved!.type).toBe(node.type)
          expect(retrieved!.description).toBe(node.description)
          // ... check all fields
        }
      ),
      { numRuns: 100 }
    )
  })
})
```


### Integration Testing

**Target:** Component interactions

**Coverage:**
- Storage adapter initialization and health checks
- Agent orchestrator coordinating multiple agents
- API endpoints calling services
- LangGraph service communication
- Hybrid storage coordination

**Example:**
```typescript
describe('Agent Orchestration', () => {
  it('should coordinate ingestion and alignment agents', async () => {
    const orchestrator = await getAgentOrchestrator()
    
    // Ingest document
    const ingestionProposals = await orchestrator.runIngestionAgent(
      'Neural networks use backpropagation',
      { title: 'Test', source_url: 'http://test.com' }
    )
    
    expect(ingestionProposals.length).toBeGreaterThan(0)
    
    // Run alignment
    const alignmentProposals = await orchestrator.runAlignmentAgent()
    
    // Should detect duplicates if any
    expect(alignmentProposals).toBeDefined()
  })
})
```

### End-to-End Testing

**Target:** Complete user workflows

**Coverage:**
- Document ingestion → concept creation → query
- Node creation → edge creation → path finding
- Agent workflow → proposal → approval → execution
- API request → service → storage → response

**Example:**
```typescript
describe('Complete Ingestion Workflow', () => {
  it('should ingest document and make concepts queryable', async () => {
    // 1. Ingest document
    const response = await fetch('/api/ingest', {
      method: 'POST',
      body: JSON.stringify({
        content: 'Transformers use attention mechanisms',
        metadata: { title: 'Test Paper', source_url: 'http://test.com' }
      })
    })
    
    expect(response.ok).toBe(true)
    
    // 2. Query for concept
    const queryResponse = await fetch('/api/query?q=transformer')
    const data = await queryResponse.json()
    
    expect(data.success).toBe(true)
    expect(data.data.length).toBeGreaterThan(0)
    expect(data.data[0].name.toLowerCase()).toContain('transformer')
  })
})
```

### Test Data Generators

**For Property-Based Testing:**

```typescript
import fc from 'fast-check'

// Generate valid knowledge nodes
function arbitraryKnowledgeNode(): fc.Arbitrary<KnowledgeNode> {
  return fc.record({
    id: fc.uuid(),
    type: fc.constantFrom('concept', 'algorithm', 'system', 'api', 'paper', 'tool'),
    name: fc.string({ minLength: 1, maxLength: 100 }),
    description: fc.string({ minLength: 10, maxLength: 500 }),
    level: fc.record({
      abstraction: fc.float({ min: 0, max: 1 }),
      difficulty: fc.float({ min: 0, max: 1 }),
      volatility: fc.float({ min: 0, max: 1 })
    }),
    cognitive_state: fc.record({
      strength: fc.float({ min: 0, max: 1 }),
      activation: fc.float({ min: 0, max: 1 }),
      decay_rate: fc.float({ min: 0, max: 0.1 }),
      confidence: fc.float({ min: 0, max: 1 })
    }),
    temporal: fc.record({
      introduced_at: fc.date(),
      last_reinforced_at: fc.date(),
      peak_relevance_at: fc.date()
    }),
    real_world: fc.record({
      used_in_production: fc.boolean(),
      companies_using: fc.nat({ max: 10000 }),
      avg_salary_weight: fc.float({ min: 0, max: 1 }),
      interview_frequency: fc.float({ min: 0, max: 1 })
    }),
    grounding: fc.record({
      source_refs: fc.array(fc.webUrl(), { maxLength: 5 }),
      implementation_refs: fc.array(fc.webUrl(), { maxLength: 5 })
    }),
    failure_surface: fc.record({
      common_bugs: fc.array(fc.uuid(), { maxLength: 5 }),
      misconceptions: fc.array(fc.uuid(), { maxLength: 5 })
    }),
    created_at: fc.date(),
    updated_at: fc.date()
  })
}

// Generate valid edges
function arbitraryKnowledgeEdge(): fc.Arbitrary<KnowledgeEdge> {
  return fc.record({
    id: fc.uuid(),
    from_node: fc.uuid(),
    to_node: fc.uuid(),
    relation: fc.constantFrom(
      'depends_on', 'abstracts', 'implements', 'replaces', 'suppresses',
      'interferes_with', 'requires_for_debugging', 'optimizes', 'causes_failure_in',
      'uses', 'improves', 'generalizes', 'specializes', 'requires',
      'fails_on', 'introduced_in', 'evaluated_on', 'competes_with', 'derived_from'
    ),
    weight: fc.record({
      strength: fc.float({ min: 0, max: 1 }),
      decay_rate: fc.float({ min: 0, max: 0.1 }),
      reinforcement_rate: fc.float({ min: 0, max: 0.2 })
    }),
    dynamics: fc.record({
      inhibitory: fc.boolean(),
      directional: fc.boolean()
    }),
    temporal: fc.record({
      created_at: fc.date(),
      last_used_at: fc.date()
    }),
    confidence: fc.float({ min: 0, max: 1 }),
    created_at: fc.date(),
    updated_at: fc.date()
  })
}
```

### Test Coverage Goals

- **Unit Tests:** 80%+ code coverage
- **Property Tests:** All 32 correctness properties
- **Integration Tests:** All major component interactions
- **E2E Tests:** All critical user workflows

### Continuous Integration

**On Pull Request:**
1. Run linter (ESLint)
2. Run type checker (TypeScript)
3. Run unit tests
4. Run property tests (100 iterations)
5. Run integration tests
6. Check test coverage

**On Merge to Main:**
1. All PR checks
2. Run E2E tests
3. Build production bundle
4. Deploy to staging

