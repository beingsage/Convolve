# UAILS: Unified Artificial Intelligence Language System

A production-ready knowledge management system that treats AI concepts as **dynamic cognitive entities** with temporal decay, memory consolidation, and intelligent agent orchestration.

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React 19 + Tailwind)           │
│         Semantic Query (Qdrant) | Graph Explorer (Neo4j)    │
└────────────┬────────────────────────────────────────────────┘
             │ REST API / WebSocket
┌────────────▼────────────────────────────────────────────────┐
│               Backend (Next.js + TypeScript)                │
├──────────────────────────────────────────────────────────────┤
│ Agent Layer │ Semantic Memory │ Knowledge Graph │ Pipeline  │
│ • Ingestion │  Query Engine   │  Node Storage   │ Ingest   │
│ • Alignment │  Vector Ops     │  Edge Storage   │ Parse    │
│ • Contradict│  Embedding      │  Relationships  │ Extract  │
│ • Curriculum│  Filtering      │  Multi-hop      │ Tag      │
│ • Research  │                 │  Reasoning      │ Embed    │
├──────────────────────────────────────────────────────────────┤
│         Config-Driven Storage Adapter Layer                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  In-Memory   │  │  MongoDB     │  │  Neo4j       │      │
│  │  (Demo)      │  │  (Graph DB)  │  │  (Graph DB)  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐                        │
│  │ PostgreSQL   │  │  Qdrant      │                        │
│  │  (Relational)│  │  (Vectors)   │                        │
│  └──────────────┘  └──────────────┘                        │
└──────────────────────────────────────────────────────────────┘
```

**Current Configuration**: Neo4j for graph operations + Qdrant for vector search

## Core Concepts

### Knowledge Nodes
Each concept is a cognitive entity with:
- **Identity**: Canonical name, type (concept/algorithm/system/api/paper/tool/failure_mode)
- **Levels**: Abstraction (0-1), difficulty (0-1), volatility (0-1)
- **Cognitive State**: Strength, activation, decay_rate, confidence
- **Temporal**: Introduction date, last reinforcement, peak relevance
- **Real-World**: Production usage, company adoption, salary weight, interview frequency
- **Grounding**: Source references, implementation links
- **Failure Surface**: Common bugs, misconceptions

### Knowledge Edges
Relationships with semantic meaning:
- `depends_on`, `abstracts`, `implements`, `replaces`, `suppresses`
- `interferes_with`, `requires_for_debugging`, `optimizes`, `causes_failure_in`
- `uses`, `improves`, `generalizes`, `specializes`, `requires`
- `fails_on`, `introduced_in`, `evaluated_on`, `competes_with`, `derived_from`

### Memory Dynamics
**Exponential decay with reinforcement:**
```
strength(t) = strength(0) * e^(-λΔt) + reinforcement
```

Where:
- λ (lambda) = base decay rate (half-life ≈ 30 days)
- Δt = time since last access
- Foundational concepts decay slower
- Frequently accessed concepts stabilize

## Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the project
git clone <repo-url>
cd uails

# Install dependencies (if needed - next-lite auto-installs)
npm install

# Copy environment template
cp .env.example .env.local

# Run development server
npm run dev
```

Navigate to `http://localhost:3000`

### Demo Data
The system comes pre-seeded with 50+ AI/ML concepts. To reseed:

```bash
npx ts-node scripts/seed-demo-data.ts
```

This creates:
- 10 core concepts (Gradient Descent, Backpropagation, Transformer, etc.)
- 20+ relationship edges
- Full temporal and real-world metadata

## Configuration

### Storage Backend
Set `STORAGE_TYPE` in `.env.local`:

```env
STORAGE_TYPE=memory      # In-memory (default, demo)
STORAGE_TYPE=mongodb     # MongoDB
STORAGE_TYPE=neo4j       # Neo4j
STORAGE_TYPE=qdrant      # Qdrant (vector DB)
STORAGE_TYPE=postgres    # PostgreSQL
```

Each backend requires connection config:

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/uails

# Neo4j
NEO4J_URI=neo4j://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=password

# Qdrant
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=your-api-key

# PostgreSQL
DATABASE_URL=postgresql://user:password@localhost:5432/uails
```

### Embeddings
```env
EMBEDDING_PROVIDER=local           # local | openai | other
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSION=1536
OPENAI_API_KEY=sk-...             # if using OpenAI
```

### Features
```env
ENABLE_VECTOR_SEARCH=true
ENABLE_GRAPH_REASONING=true
AUTO_CONCEPT_EXTRACTION=true
```

## API Endpoints

### Query
```bash
# Semantic search
POST /api/query
{
  "query": "What is backpropagation?",
  "filters": {
    "difficulty_range": [0, 0.7],
    "node_types": ["concept", "algorithm"]
  },
  "context": "I know calculus"
}

# Quick search
GET /api/query?q=transformer
```

### Nodes
```bash
# List all nodes
GET /api/nodes?page=1&limit=20

# Search nodes
GET /api/nodes?search=gradient

# Filter by type
GET /api/nodes?type=concept

# Create node
POST /api/nodes
{
  "name": "Attention Mechanism",
  "type": "concept",
  "description": "..."
}
```

### Agents
```bash
# Run ingestion agent
POST /api/agents
{
  "action": "ingest",
  "content": "document text",
  "metadata": { "title": "Paper Title", "source_url": "..." }
}

# Run full workflow
POST /api/agents { "action": "workflow" }

# Run specific agent
POST /api/agents { "action": "align" }     # alignment
POST /api/agents { "action": "contradict" } # contradiction
POST /api/agents { "action": "curriculum", "user_known_nodes": [...] }
POST /api/agents { "action": "research" }  # research

# List proposals
GET /api/agents?status=proposed
```

## Frontend Interfaces

### 1. Semantic Query (`/query`)
- Natural language questions about AI concepts
- Personalized explanations based on user background
- Filter by difficulty, abstraction, source tier
- Shows related concepts and prerequisites

### 2. Graph Explorer (`/graph`)
- Visualize knowledge graph structure
- Browse nodes and their relationships
- Multi-hop reasoning visualization
- Graph statistics and metrics

### 3. Skill Heatmap (`/skills`)
- Track mastery levels across domains
- Reinforcement frequency tracking
- Domain-specific progress
- Personalized recommendations

### 4. Learning Paths (`/paths`)
- Curated curricula for different goals
- Prerequisite tracking
- Difficulty-based progression
- Time-to-completion estimates

## Agents

The system runs 5 autonomous agents:

### 1. **Ingestion Agent**
- Processes documents (PDF, HTML, markdown)
- Extracts concepts and claims
- Creates concept nodes with high confidence
- **Trigger**: Manual `/api/agents?action=ingest`

### 2. **Alignment Agent**
- Finds duplicate concepts
- Normalizes naming conventions
- Proposes merging similar nodes
- **Trigger**: Scheduled or manual `/api/agents?action=align`

### 3. **Contradiction Agent**
- Detects conflicting claims
- Flags COMPETES_WITH or FAILS_ON relationships
- Creates first-class conflict nodes
- **Trigger**: Scheduled or `/api/agents?action=contradict`

### 4. **Curriculum Agent**
- Generates personalized learning paths
- Detects prerequisite gaps
- Recommends next concepts
- **Trigger**: `/api/agents?action=curriculum?user_known_nodes=[...]`

### 5. **Research Agent**
- Finds knowledge gaps
- Identifies low-confidence concepts
- Proposes new connections
- **Trigger**: `/api/agents?action=research`

## Development

### Project Structure
```
├── lib/
│   ├── types/                  # TypeScript type definitions
│   ├── config/                 # Configuration system
│   ├── storage/
│   │   ├── adapter.ts         # Storage interface
│   │   ├── factory.ts         # Singleton pattern
│   │   └── adapters/          # Backend implementations
│   │       ├── memory.ts
│   │       └── mongodb.ts
│   └── services/
│       ├── ingestion.ts       # Document processing
│       ├── knowledge-graph.ts # Graph operations
│       ├── memory-decay.ts    # Temporal dynamics
│       └── semantic-query.ts  # Query engine
├── agents/
│   ├── orchestrator.ts        # Agent coordination
│   ├── ingestion-agent.ts     # Document ingestion
│   └── other-agents.ts        # Alignment, contradiction, etc.
├── app/
│   ├── api/                   # REST endpoints
│   ├── query/                 # Query interface
│   ├── graph/                 # Graph explorer
│   ├── skills/                # Skill heatmap
│   └── paths/                 # Learning paths
├── scripts/
│   └── seed-demo-data.ts      # Demo seeding
└── public/
```

### Adding a New Storage Backend

1. Create `/lib/storage/adapters/newbackend.ts`
2. Implement `IStorageAdapter` interface
3. Update factory in `/lib/storage/adapter.ts`
4. Add config to `/lib/config/storage.ts`
5. Test with `/api/nodes` endpoints

### Running Tests (TODO)

```bash
npm test
npm run test:integration
```

## Memory Decay System

### Formula
```
strength(t+1) = strength(t) * e^(-λΔt) + reinforcement
```

### Configuration
```typescript
{
  base_lambda: 0.693 / (30 * 24 * 60 * 60 * 1000),  // 30-day half-life
  reinforcement_boost: 0.1,                          // 10% strength on access
  citation_weight: 0.05,                             // Citations slow decay
  foundational_bonus: 0.5,                           // Foundational slower decay
}
```

### Consolidation
- Frequently co-activated vectors merge into higher-level representations
- Reduces cognitive load while maintaining expressiveness
- Automatically triggered during `memory-decay` operations

## Deployment

### Docker
```bash
docker build -t uails:latest .
docker run -p 3000:3000 -e STORAGE_TYPE=memory uails:latest
```

### Vercel
```bash
vercel deploy
```

Set environment variables in Vercel dashboard.

### Self-Hosted
```bash
npm run build
npm run start
```

## Limitations & Future Work

### Current Limitations
- Vector search uses cosine similarity (no real embeddings without config)
- Graph visualization is static (no interactive D3 yet)
- No user authentication or multi-tenant support
- Memory adapter clears on restart

### Planned Features
- Real LLM-powered concept extraction
- Interactive graph visualization with D3/Cytoscape
- User accounts and personalized knowledge graphs
- Full-text search with ranking
- Temporal query support ("concepts from 2020")
- Conflict resolution workflows
- Knowledge graph versioning and branching

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit changes with clear messages
4. Submit a pull request

## License

MIT License - See LICENSE file

## Citation

```bibtex
@software{uails2024,
  title = {UAILS: Unified Artificial Intelligence Language System},
  author = {Your Name},
  year = {2024},
  url = {https://github.com/yourusername/uails}
}
```

## Support

- **Issues**: Report bugs on GitHub
- **Discussions**: Ask questions in GitHub Discussions
- **Documentation**: See `/docs` folder
- **Email**: support@uails.dev (coming soon)

---

Built with ❤️ for the AI research community
