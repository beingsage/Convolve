# UAILS Quick Reference Card

## Start Here
```bash
npm install              # Install dependencies
npm run dev             # Start local dev (http://localhost:3000)
npm run seed            # Seed 10 demo concepts
npm run build           # Production build
npm start               # Run production server
```

## Environment Variables
```bash
STORAGE_TYPE=memory              # memory, mongodb, postgres, neo4j, qdrant
MONGODB_URI=mongodb://...        # For MongoDB
DATABASE_URL=postgresql://...    # For PostgreSQL
NEO4J_URI=neo4j+s://...          # For Neo4j
QDRANT_URL=http://...            # For Qdrant
LOG_LEVEL=info                   # debug, info, warn, error
PORT=3000                        # Server port
NODE_ENV=development             # development, production
```

## API Endpoints

### Query (`POST /api/query`)
Search for concepts
```bash
curl "http://localhost:3000/api/query?q=transformer"
```

### Nodes (`GET/POST /api/nodes`)
List or create concepts
```bash
# List
curl "http://localhost:3000/api/nodes?page=1&limit=10"

# Create
curl -X POST http://localhost:3000/api/nodes \
  -H "Content-Type: application/json" \
  -d '{
    "type": "concept",
    "name": "Concept Name",
    "description": "...",
    "level": {"abstraction": 0.7, "difficulty": 0.6, "volatility": 0.2},
    ...
  }'
```

### Agents (`POST /api/agents`)
Run autonomous agents
```bash
# Ingestion
curl -X POST http://localhost:3000/api/agents \
  -d '{"action": "ingest", "content": "...", "metadata": {...}}'

# Alignment
curl -X POST http://localhost:3000/api/agents \
  -d '{"action": "align"}'

# Contradiction detection
curl -X POST http://localhost:3000/api/agents \
  -d '{"action": "contradict"}'

# Curriculum generation
curl -X POST http://localhost:3000/api/agents \
  -d '{"action": "curriculum", "user_known_nodes": ["..."]}'

# Research gaps
curl -X POST http://localhost:3000/api/agents \
  -d '{"action": "research"}'
```

### Health (`GET /api/health`)
Check system status
```bash
curl http://localhost:3000/api/health
```

## Frontend Pages

| URL | Purpose |
|-----|---------|
| `/` | Home & overview |
| `/query` | Semantic search |
| `/graph` | Knowledge graph explorer |
| `/skills` | Skill heatmap |
| `/paths` | Learning paths |

## Code Structure

### Storage (Swap backends easily)
```typescript
import { getStorageAdapter } from '@/lib/storage/factory';

const storage = await getStorageAdapter();
const node = await storage.getNode('node_id');
const nodes = await storage.listNodes(1, 10);
```

### Services
```typescript
import { KnowledgeGraphService } from '@/lib/services/knowledge-graph';
import { SemanticQuery } from '@/lib/services/semantic-query';

const graph = new KnowledgeGraphService(storage);
const query = new SemanticQuery(storage);
```

### Agents
```typescript
import { AgentOrchestrator } from '@/lib/agents/orchestrator';

const orchestrator = new AgentOrchestrator(storage);
const result = await orchestrator.runAgent('curriculum', {
  user_known_nodes: ['...']
});
```

## Data Models

### Node (Concept)
```typescript
{
  id: string;
  type: 'concept' | 'algorithm' | 'system' | 'api' | 'paper' | 'tool' | 'failure_mode' | 'optimization' | 'abstraction';
  name: string;
  description: string;
  level: {
    abstraction: number;  // [0..1]
    difficulty: number;   // [0..1]
    volatility: number;   // [0..1]
  };
  cognitive_state: {
    strength: number;     // [0..1]
    activation: number;   // [0..1]
    decay_rate: number;
    confidence: number;   // [0..1]
  };
  temporal: {
    introduced_at: Date;
    last_reinforced_at: Date;
    peak_relevance_at: Date;
  };
  real_world: {
    used_in_production: boolean;
    companies_using: number;
    avg_salary_weight: number;  // [0..1]
    interview_frequency: number; // [0..1]
  };
  grounding: {
    source_refs: string[];
    implementation_refs: string[];
  };
  failure_surface: {
    common_bugs: string[];
    misconceptions: string[];
  };
  created_at: Date;
  updated_at: Date;
}
```

### Edge (Relationship)
```typescript
{
  id: string;
  from_node: string;
  to_node: string;
  relation: 'depends_on' | 'abstracts' | 'implements' | 'replaces' | 'suppresses' | 
            'interferes_with' | 'requires_for_debugging' | 'optimizes' | 'causes_failure_in' |
            'uses' | 'improves' | 'generalizes' | 'specializes' | 'requires' | 'fails_on' |
            'introduced_in' | 'evaluated_on' | 'competes_with' | 'derived_from';
  weight: {
    strength: number;           // [0..1]
    decay_rate: number;
    reinforcement_rate: number;
  };
  dynamics: {
    inhibitory: boolean;
    directional: boolean;
  };
  temporal: {
    created_at: Date;
    last_used_at: Date;
  };
  confidence: number;  // [0..1]
  conflicting?: boolean;
  created_at: Date;
  updated_at: Date;
}
```

## Memory Decay

Concepts fade with time:
```typescript
strength(t) = strength(0) * e^(-λ*Δt) + reinforcement
```

Access a concept → strength increases  
Ignore a concept → strength decreases  
Foundational concepts decay slower  

## Deployment

### Vercel (Recommended)
```bash
git push  # Auto-deploys
```
Set env vars in Vercel dashboard.

### Docker
```bash
docker build -t uails .
docker run -e STORAGE_TYPE=memory -p 3000:3000 uails
```

### Docker Compose
```bash
docker-compose up -d
```

### Self-Hosted
```bash
npm run build
npm start  # Runs on :3000
# Use nginx reverse proxy + SSL
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Port 3000 in use | `lsof -i :3000` or change `PORT` env var |
| Module not found | `rm -rf node_modules && npm install` |
| Storage not initializing | Check `.env` has `STORAGE_TYPE` set |
| API 404 | Make sure `npm run dev` is running |
| Slow queries | Use MongoDB instead of memory for >100 concepts |
| Build fails | `npm run build` should work; check logs |

## File Locations

| What | Where |
|------|-------|
| Type definitions | `/lib/types/index.ts` |
| Storage adapters | `/lib/storage/adapters/` |
| Services | `/lib/services/` |
| Agents | `/lib/agents/` |
| API routes | `/app/api/` |
| Frontend pages | `/app/*/page.tsx` |
| Demo data | `/scripts/seed-demo-data.ts` |
| Config | `/lib/config/storage.ts` |
| Env example | `/.env.example` |

## Common Tasks

### Add a new concept
```bash
curl -X POST http://localhost:3000/api/nodes \
  -H "Content-Type: application/json" \
  -d '{
    "type": "concept",
    "name": "Your Concept",
    "description": "Description here",
    "level": {
      "abstraction": 0.7,
      "difficulty": 0.5,
      "volatility": 0.2
    },
    "cognitive_state": {
      "strength": 0.8,
      "activation": 0.5,
      "decay_rate": 0.01,
      "confidence": 0.85
    },
    "temporal": {
      "introduced_at": "2024-01-01T00:00:00Z",
      "last_reinforced_at": "2024-01-22T00:00:00Z",
      "peak_relevance_at": "2024-01-22T00:00:00Z"
    },
    "real_world": {
      "used_in_production": true,
      "companies_using": 100,
      "avg_salary_weight": 0.7,
      "interview_frequency": 0.6
    },
    "grounding": {
      "source_refs": ["paper1"],
      "implementation_refs": []
    },
    "failure_surface": {
      "common_bugs": [],
      "misconceptions": []
    },
    "canonical_name": "Your Concept",
    "first_appearance_year": 2024,
    "domain": "Your Domain"
  }'
```

### Search concepts
```typescript
// In React component
const { data } = useSWR(
  `/api/query?q=${query}`,
  fetch
);
```

### Switch storage backend
```bash
# From in-memory to MongoDB
STORAGE_TYPE=mongodb MONGODB_URI=mongodb://localhost:27017/uails npm start
```

### View logs
```bash
# Development
npm run dev  # Shows logs in terminal

# Production (Docker)
docker logs container-id

# Production (PM2)
pm2 logs

# Vercel
Dashboard → Deployments → Function Logs
```

## Performance Tips

- Use MongoDB for >100 concepts
- Add indexes in MongoDB for frequent queries
- Cache common searches with Redis
- Use Neo4j for complex graph queries
- Add Qdrant for vector similarity search
- Enable CDN (Vercel does this automatically)

## Security Tips

- Never commit `.env.local`
- Use strong MongoDB passwords
- Enable HTTPS in production
- Validate all API inputs
- Keep dependencies updated: `npm audit`
- Use environment variables for secrets
- Set `NODE_ENV=production` in production

## Documentation

| Document | For |
|----------|-----|
| README.md | Full overview & features |
| QUICKSTART.md | Getting started (2 min) |
| SETUP.md | Configuration options |
| ARCHITECTURE.md | Technical deep dive |
| DEPLOY.md | Production deployment |
| SYSTEM_OVERVIEW.md | What's built & how |
| REFERENCE.md | This quick reference |

---

**Print this page** or bookmark for quick lookup! 📌

For detailed docs, see the markdown files in the root directory.
