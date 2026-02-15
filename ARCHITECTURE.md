# UAILS Architecture Deep Dive

## Design Philosophy

UAILS treats **knowledge as dynamic cognitive entities**, not static facts:

- **Nodes** = Concepts with internal state (strength, confidence, decay)
- **Edges** = Active influences that shape reasoning
- **Time** = Memory evolves; unused knowledge fades
- **Agents** = Autonomous services that maintain consistency
- **Flexibility** = Storage agnostic; swap backends with one config

## Core Layers

### 1. Data Model Layer (`/lib/types/`)

**Core Entities:**
```typescript
KnowledgeNode {
  id, type, name, description
  level: { abstraction, difficulty, volatility }
  cognitive_state: { strength, activation, decay_rate, confidence }
  temporal: { introduced_at, last_reinforced_at, peak_relevance_at }
  real_world: { used_in_production, companies_using, salary_weight, interview_frequency }
  grounding: { source_refs, implementation_refs }
  failure_surface: { common_bugs, misconceptions }
}

KnowledgeEdge {
  from_node, to_node, relation (18 types)
  weight: { strength, decay_rate, reinforcement_rate }
  dynamics: { inhibitory, directional }
  temporal: { created_at, last_used_at }
}

VectorPayload {
  id, embedding, embedding_type, collection
  entity_refs, confidence, abstraction_level, source_tier
}
```

### 2. Storage Layer (`/lib/storage/`)

**Architecture:**
```
IStorageAdapter (interface)
    ├── InMemoryAdapter (in-process, fast)
    ├── MongoDBAdapter (document, scalable)
    ├── Neo4jAdapter (graph, relationships)
    ├── QdrantAdapter (vectors, similarity)
    └── PostgresAdapter (relational, normalized)
    └── HybridAdapter (combined)
```

**Singleton Pattern:**
- `getStorageAdapter()`: Returns global instance
- `factory.ts`: Creates appropriate adapter from config
- `config/storage.ts`: Environment-based configuration

**Key Operations:**
- Nodes: CRUD, search, pagination, type filtering
- Edges: CRUD, traversal, path-finding (BFS)
- Vectors: Store, search (cosine similarity), decay updates
- Chunks: Store (for document ingestion), retrieve by source
- Transactions: Begin, commit, rollback (backend-specific)

### 3. Service Layer (`/lib/services/`)

#### Ingestion Service
```
Document
  ↓ Parse (remove markdown/HTML)
  ↓ Chunk (512 chars, 100 char overlap)
  ↓ Extract Claims (definition/method/result/limitation)
  ↓ Extract Concepts (keyword matching)
  ↓ Tag Chunks (link concepts to chunks)
  ↓ Store in DB
```

#### Knowledge Graph Service
- Create nodes and edges with metadata
- Find concept paths (multi-hop)
- Compare concepts (similarities/differences)
- Get prerequisites (dependency traversal)
- Detect conflicts

#### Memory Decay Service
```
Formula: strength(t) = strength(0) * e^(-λΔt) + reinforcement

Configuration:
- base_lambda: 0.693 / (30 days) = half-life of 30 days
- reinforcement_boost: +0.1 per access
- citation_weight: Reduces decay rate
- foundational_bonus: Slower decay for basics

Consolidation:
- Frequent co-activations → higher-level representations
- Automatic during maintenance cycles
```

#### Semantic Query Service
- Keyword search (production: use embeddings)
- Personalized explanations based on context
- Concept comparison
- Similarity detection
- Filtering (difficulty, abstraction, source tier)

#### Reasoning Engine
- BFS pathfinding
- Transitive closure
- Dependency analysis
- Curriculum generation
- Concept explanation

### 4. Agent Layer (`/lib/agents/`)

**AgentOrchestrator**
- Coordinates 5 agents
- Manages proposal queue
- Auto-approves high-confidence proposals
- Executes approved changes
- Tracks statistics

**5 Autonomous Agents:**

```
┌─────────────────────────────────────────────┐
│ Ingestion Agent                             │
│ Processes documents → creates concept nodes │
│ Confidence: 0.75-0.85                       │
│ Trigger: Manual or scheduled                │
└─────────────────────────────────────────────┘
         ↓ (proposes new concepts)

┌─────────────────────────────────────────────┐
│ Alignment Agent                             │
│ Finds duplicates → proposes merging         │
│ Uses string similarity (Levenshtein)        │
│ Confidence: 0.80+                           │
│ Trigger: Scheduled                          │
└─────────────────────────────────────────────┘
         ↓ (normalizes duplicate concepts)

┌─────────────────────────────────────────────┐
│ Contradiction Agent                         │
│ Detects conflicting edges (COMPETES_WITH)   │
│ Marks with conflict flag                    │
│ Confidence: 0.70-0.90                       │
│ Trigger: Scheduled                          │
└─────────────────────────────────────────────┘
         ↓ (flags inconsistencies)

┌─────────────────────────────────────────────┐
│ Curriculum Agent                            │
│ Generates learning paths                    │
│ Detects prerequisites                       │
│ Confidence: 0.80-0.85                      │
│ Trigger: User request                       │
└─────────────────────────────────────────────┘
         ↓ (recommends next concepts)

┌─────────────────────────────────────────────┐
│ Research Agent                              │
│ Finds low-confidence nodes                  │
│ Identifies isolated concepts                │
│ Confidence: 0.60-0.70                       │
│ Trigger: Scheduled                          │
└─────────────────────────────────────────────┘
         ↓ (identifies knowledge gaps)
```

**Proposal Mechanism:**
```
Agent → Generate Proposal
         (id, action, target, reasoning, confidence)
    ↓
    ├─→ confidence > 0.95? Auto-approve
    │
    └─→ Wait for human review
         User: approve/reject
         ↓
         Execute change (create/update/merge)
```

### 5. API Layer (`/app/api/`)

**Routes:**
- `POST /api/query` - Semantic search
- `GET /api/query?q=...` - Quick search
- `GET /api/nodes` - List/search/filter
- `POST /api/nodes` - Create
- `POST /api/agents` - Run agents
- `GET /api/agents` - List proposals

**Response Format:**
```json
{
  "success": boolean,
  "data": any,
  "error": string (if failed),
  "timestamp": ISO8601
}
```

### 6. Frontend Layer (`/app/`)

**Pages:**
```
/                 (Home, navigation)
/query            (Semantic search)
/graph            (Graph explorer)
```

**Tech Stack:**
- Next.js 14 App Router
- React 19 with hooks
- SWR for client-side data fetching
- Tailwind CSS v4

## Data Flow Examples

### Ingestion Flow
```
User uploads document
  ↓
POST /api/agents?action=ingest
  ↓
IngestionAgent.processDocument()
  ├─ Pipeline.ingest()
  │  ├─ Parse format
  │  ├─ Chunk content
  │  ├─ Extract claims
  │  ├─ Extract concepts
  │  └─ Store chunks
  ├─ For each concept:
  │  └─ Generate AgentProposal (confidence: 0.8)
  ↓
Storage.createNode() (if auto-approved)
  ↓
Concepts now queryable in semantic search
```

### Query Flow
```
User searches: "transformer"
  ↓
GET /api/query?q=transformer
  ↓
SemanticQueryEngine.query()
  ├─ Storage.searchNodes("transformer", limit=10)
  ├─ Apply filters (difficulty, abstraction, etc)
  ├─ Rank by relevance
  ├─ Generate explanation
  └─ Return results
  ↓
Frontend renders concept cards
```

### Memory Maintenance Flow
```
DecayManager.shouldCalculateDecay()? (hourly check)
  ↓
For each node in storage:
  ├─ Calculate decay score
  ├─ strength(t) = strength(0) * e^(-λΔt) + reinforcement
  ├─ Update decay_rate
  └─ Store updated node
  ↓
For frequently co-activated vectors:
  ├─ Consolidate to single vector
  └─ Store as higher-level concept
```

## Configuration System

### Hierarchy
```
Default values (in code)
  ↓ Override with
Environment variables (.env.local)
  ↓ Used by
config/storage.ts
  ↓ Creates
StorageAdapter instance
  ↓ Used by
All services (storage, ingestion, agents)
```

### Switching Backends
**Step 1:** Change `.env.local`
```env
STORAGE_TYPE=mongodb
MONGODB_URI=mongodb://localhost:27017/uails
```

**Step 2:** No code changes needed!
```typescript
const storage = await getStorageAdapter(); // Automatically uses MongoDB
```

## Scalability Considerations

### In-Memory (Demo)
- ✅ No setup
- ✅ Fast for <10K nodes
- ❌ Data lost on restart
- ❌ No persistence

### MongoDB
- ✅ Scalable
- ✅ Good for document ops
- ✅ Can store raw text
- ⚠️ Slower graph traversal
- Need: Indexes on `name`, `type`, `created_at`

### Neo4j
- ✅ Native graph operations
- ✅ Relationship traversal fast
- ✅ Pattern matching
- ⚠️ Slower search, embedding handling
- Need: Cypher query optimization

### PostgreSQL
- ✅ Reliable
- ✅ Full SQL capabilities
- ✅ Good for analytics
- ⚠️ Verbose schema
- Need: Normalized tables for nodes/edges/vectors

### Qdrant
- ✅ Vector similarity search
- ✅ Payload filtering
- ✅ Hybrid search
- ⚠️ Not ideal for graph structure
- Use: As supplementary index with primary storage

### Hybrid (Recommended for Production)
- Combines Neo4j (graph) + MongoDB (documents) + Qdrant (vectors)
- Optimal for all operation types
- Requires all three backends configured

## Performance Benchmarks (Expected)

| Operation | In-Memory | MongoDB | Neo4j |
|-----------|-----------|---------|-------|
| Create node | 0.1ms | 5ms | 10ms |
| Search (100 nodes) | 1ms | 20ms | 30ms |
| Path finding (5 hops) | 5ms | 100ms | 20ms |
| Decay calculation (1000 nodes) | 50ms | 500ms | 300ms |
| Query API response | 2ms | 30ms | 40ms |

## Testing Strategy

```
Unit Tests
  ├─ Services (decay, ingestion, query)
  ├─ Utilities (similarity, path finding)
  └─ Agents (individual logic)

Integration Tests
  ├─ Storage adapters (CRUD ops)
  ├─ API routes (request/response)
  └─ Agent workflows

End-to-End Tests
  ├─ Full ingest → query flow
  ├─ Agent coordination
  └─ Frontend + Backend
```

## Security Considerations

- ✅ SQL injection: Parameterized queries (storage layer)
- ✅ XSS: React auto-escaping + Tailwind
- ⚠️ Authentication: None (add if needed)
- ⚠️ Authorization: None (add if needed)
- ⚠️ Rate limiting: None (add if needed)
- ⚠️ CORS: Default allows all origins

## LangGraph Service (`/langgraph-service/`)

Python microservice for advanced agent workflows:

```
langgraph-service/
├── main.py                 # FastAPI entry point
├── agents/
│   ├── ingestion.py       # Document processing
│   └── other_agents.py    # Reasoning workflows
├── workflows/
│   ├── knowledge_workflow.py
│   └── reasoning_workflow.py
├── storage/
│   ├── neo4j_client.py
│   └── qdrant_client.py
└── models/
    └── state.py           # Shared state definitions
```

**Endpoints:**
- `/ingest` - Process documents with LLM
- `/reasoning` - Multi-step reasoning
- `/health` - Service health check

## Future Extensions

### LLM Integration
- Use embeddings from OpenAI/Local
- Replace keyword search with semantic
- Automated concept extraction

### Graph Visualization
- D3.js or Cytoscape
- Interactive node selection
- Path highlighting

### User Management
- Per-user knowledge graphs
- Collaboration features
- Activity tracking

### Advanced Reasoning
- Symbolic AI integration
- Constraint satisfaction
- Inference rules

### Knowledge Market
- Share concepts with others
- Rate quality
- Decentralized storage

