# UAILS Getting Started Guide

Get up and running in 2 minutes, then dive deeper.

---

## Quick Start (2 minutes)

### 1. Install & Run

```bash
npm install
npm run dev
```

Open **http://localhost:3000**

### 2. Explore the Interfaces

| Page | URL | Purpose |
|------|-----|---------|
| Home | `/` | Overview & stats |
| Semantic Query | `/query` | Search AI concepts |
| Graph Explorer | `/graph` | Browse relationships |

### 3. Try the API

```bash
# Search concepts
curl "http://localhost:3000/api/query?q=transformer"

# List nodes
curl "http://localhost:3000/api/nodes?limit=10"

# Check health
curl http://localhost:3000/api/health
```

---

## Configuration

### Environment Variables

```env
# Storage (switch backends easily)
STORAGE_TYPE=memory              # memory, mongodb, postgres, neo4j, qdrant, hybrid
MONGODB_URI=mongodb://...       # For MongoDB
DATABASE_URL=postgresql://...   # For PostgreSQL
NEO4J_URI=neo4j+s://...         # For Neo4j
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=password
QDRANT_URL=http://...           # For Qdrant
QDRANT_API_KEY=...

# Server
PORT=3000
NODE_ENV=development
LOG_LEVEL=info

# Embeddings
EMBEDDING_PROVIDER=local
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSION=1536
```

### Switch Storage Backend

```bash
# In-memory (default, no setup)
STORAGE_TYPE=memory

# MongoDB
STORAGE_TYPE=mongodb
MONGODB_URI=mongodb://localhost:27017/uails

# Neo4j
STORAGE_TYPE=neo4j
NEO4J_URI=neo4j://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=password

# Qdrant
STORAGE_TYPE=qdrant
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=your-key

# PostgreSQL  
STORAGE_TYPE=postgres
DATABASE_URL=postgresql://user:pass@localhost:5432/uails

# Hybrid (all backends)
STORAGE_TYPE=hybrid
```

---

## API Reference

### Query (`POST /api/query`)

```bash
curl -X POST http://localhost:3000/api/query \
  -H "Content-Type: application/json" \
  -d '{"query": "What is backpropagation?"}'
```

### Nodes

```bash
# List
curl "http://localhost:3000/api/nodes?page=1&limit=10"

# Create
curl -X POST http://localhost:3000/api/nodes \
  -H "Content-Type: application/json" \
  -d '{
    "type": "concept",
    "name": "Your Concept",
    "description": "Description here",
    "level": {"abstraction": 0.7, "difficulty": 0.5, "volatility": 0.2},
    "cognitive_state": {"strength": 0.8, "activation": 0.5, "decay_rate": 0.01, "confidence": 0.85},
    "real_world": {"used_in_production": true, "companies_using": 100, "avg_salary_weight": 0.7, "interview_frequency": 0.6}
  }'
```

### Agents

```bash
# Ingestion
curl -X POST http://localhost:3000/api/agents \
  -H "Content-Type: application/json" \
  -d '{"action": "ingest", "content": "content to process", "metadata": {}}'

# Alignment
curl -X POST http://localhost:3000/api/agents \
  -H "Content-Type: application/json" \
  -d '{"action": "align"}'

# Contradiction detection
curl -X POST http://localhost:3000/api/agents \
  -H "Content-Type: application/json" \
  -d '{"action": "contradict"}'

# Curriculum generation
curl -X POST http://localhost:3000/api/agents \
  -H "Content-Type: application/json" \
  -d '{"action": "curriculum", "user_known_nodes": ["node_id_1"]}'

# Research gaps
curl -X POST http://localhost:3000/api/agents \
  -H "Content-Type: application/json" \
  -d '{"action": "research"}'
```

---

## Data Models

### Node (Knowledge Concept)

```typescript
{
  id: string;
  type: 'concept' | 'algorithm' | 'system' | 'api' | 'paper' | 'tool' | 'failure_mode' | 'optimization' | 'abstraction';
  name: string;
  description: string;
  level: {
    abstraction: number;   // [0..1]
    difficulty: number;    // [0..1]
    volatility: number;    // [0..1]
  };
  cognitive_state: {
    strength: number;     // [0..1]
    activation: number;   // [0..1]
    decay_rate: number;
    confidence: number;    // [0..1]
  };
  temporal: {
    introduced_at: Date;
    last_reinforced_at: Date;
    peak_relevance_at: Date;
  };
  real_world: {
    used_in_production: boolean;
    companies_using: number;
    avg_salary_weight: number;
    interview_frequency: number;
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
    strength: number;
    decay_rate: number;
    reinforcement_rate: number;
  };
  dynamics: {
    inhibitory: boolean;
    directional: boolean;
  };
  confidence: number;  // [0..1]
  conflicting?: boolean;
  created_at: Date;
  updated_at: Date;
}
```

---

## Memory Decay

Concepts fade over time with exponential decay:

```typescript
strength(t) = strength(0) * e^(-λ*Δt) + reinforcement
```

- Access a concept → strength increases
- Ignore a concept → strength decreases
- Foundational concepts decay slower

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Port 3000 in use | `lsof -i :3000` or `PORT=3001 npm run dev` |
| Module not found | `rm -rf node_modules && npm install` |
| Storage not initializing | Check `.env` has `STORAGE_TYPE` set |
| API 404 | Make sure `npm run dev` is running |
| Slow queries | Use MongoDB for >100 concepts |
| Build fails | `npm run build` - check for errors |

---

## Common Tasks

### Reseed Demo Data
```bash
npm run seed
```

### View Logs
```bash
npm run dev  # Development
```

### Switch Storage
```bash
STORAGE_TYPE=mongodb MONGODB_URI=mongodb://localhost:27017/uails npm start
```

---

## Useful Commands

```bash
npm run dev              # Start dev server
npm run dev:full         # Start dev + LangGraph service
npm run build            # Production build
npm start                # Run production
npm run seed             # Seed demo data
npm run lint             # Check code quality
```

---

## Deployment

### Vercel Deployment

1. Push to GitHub
2. Import project in Vercel
3. Set environment variables:
   ```
   STORAGE_TYPE=mongodb
   MONGODB_URI=mongodb+srv://...
   LOG_LEVEL=info
   NODE_ENV=production
   ```
4. Deploy

### Docker Deployment

```dockerfile
# Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

```bash
# Build and run
docker build -t uails .
docker run -p 3000:3000 uails

# Or with docker-compose
docker-compose up -d
```

### Docker Compose (With MongoDB)

```yaml
version: '3.9'
services:
  app:
    build: .
    ports:
      - '3000:3000'
    environment:
      STORAGE_TYPE: mongodb
      MONGODB_URI: mongodb://mongo:27017/uails
      NODE_ENV: production
    depends_on:
      - mongo

  mongo:
    image: mongo:6.0
    ports:
      - '27017:27017'
    volumes:
      - mongo_data:/data/db

volumes:
  mongo_data:
```

### Self-Hosted (Linux/Mac) with Nginx

```nginx
# /etc/nginx/sites-available/uails
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable SSL with Let's Encrypt:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

---

## Production Recommendations

### Recommended Stack
```
Frontend: Vercel (auto-scaling)
Backend: Vercel or EC2
Storage: MongoDB Atlas (cloud)
Vectors: Qdrant Cloud
Cache: Redis/Upstash
CDN: Vercel CDN
```

### Cost Estimates

| Service | Free Tier | Production |
|---------|-----------|-----------|
| Vercel | 3 deployments/mo | $20/mo |
| MongoDB Atlas | 512MB storage | $57/mo |
| Qdrant Cloud | - | $25/mo |
| Upstash Redis | 10K cmds/day | $80/mo |
| **Total** | **Free** | **~$200/mo** |

### Security Checklist

- [ ] Set strong database passwords
- [ ] Enable HTTPS/SSL
- [ ] Use environment variables (never hardcode secrets)
- [ ] Add CORS headers if needed
- [ ] Rate limit API endpoints
- [ ] Validate all inputs
- [ ] Keep dependencies updated (`npm audit`)
- [ ] Backup database regularly

---

## Next Steps

1. **Explore** - Try searches, graph explorer
2. **Add Data** - POST to `/api/nodes` or use agents
3. **Switch Backend** - Change `STORAGE_TYPE` to MongoDB/Neo4j/Qdrant
4. **Scale Up** - See SCALING_GUIDE.md for 100K+ nodes

---

## More Documentation

| Document | For |
|----------|-----|
| README.md | Full overview & architecture |
| ARCHITECTURE.md | Technical deep dive |
| SCALING_GUIDE.md | Scaling to 100K+ nodes |
| TODO.md | Project tracking & status |

