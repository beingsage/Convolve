# UAILS Quick Start Guide

Get up and running in 2 minutes.

## 1. Start the Project

```bash
# The system uses in-memory storage by default (no setup needed!)
npm run dev
```

Open http://localhost:3000 in your browser.

## 2. Explore the Interfaces

### Home Page (/)
Overview of all features with stats

### Semantic Query (/query)
- Search for AI concepts: "What is backpropagation?"
- Get intelligent, contextualized explanations
- Pre-seeded with 10+ core concepts

### Graph Explorer (/graph)
- Browse knowledge base structure
- See relationships between concepts
- View graph statistics

### Skill Heatmap (/skills)
- Track your mastery levels
- See reinforcement patterns
- Get personalized recommendations

### Learning Paths (/paths)
- Discover curated curricula
- View prerequisites
- Get time estimates

## 3. Use the API

### Semantic Query
```bash
curl "http://localhost:3000/api/query?q=transformer"
```

Response:
```json
{
  "success": true,
  "data": {
    "nodes": [
      {
        "id": "node_transformer",
        "name": "Transformer",
        "type": "concept",
        "description": "...",
        "level": { "abstraction": 0.5, "difficulty": 0.7, "volatility": 0.3 },
        "cognitive_state": { "strength": 0.91, "activation": 0.95, "confidence": 0.94 },
        ...
      }
    ],
    "explanation": "Found: **Transformer**..."
  }
}
```

### List All Nodes
```bash
curl "http://localhost:3000/api/nodes?page=1&limit=10"
```

### Run Agents
```bash
# Ingestion: Process new content
curl -X POST http://localhost:3000/api/agents \
  -H "Content-Type: application/json" \
  -d '{
    "action": "ingest",
    "content": "Transformers use attention mechanisms...",
    "metadata": {
      "title": "Attention is All You Need",
      "source_url": "https://..."
    }
  }'

# Full workflow
curl -X POST http://localhost:3000/api/agents \
  -d '{"action": "workflow"}'

# Alignment
curl -X POST http://localhost:3000/api/agents \
  -d '{"action": "align"}'

# Contradiction detection
curl -X POST http://localhost:3000/api/agents \
  -d '{"action": "contradict"}'

# Curriculum generation
curl -X POST http://localhost:3000/api/agents \
  -d '{
    "action": "curriculum",
    "user_known_nodes": ["node_gradient_descent", "node_backpropagation"]
  }'

# Research gaps
curl -X POST http://localhost:3000/api/agents \
  -d '{"action": "research"}'
```

## 4. Key Features

### Real-Time Demo Data
- 10 core AI/ML concepts pre-seeded
- 20+ semantic relationships
- Temporal metadata included
- Ready to explore immediately

### Memory Dynamics
- Concepts decay over time if unused
- Reinforcement boosts strength
- Foundational concepts decay slower
- Volatility indicates freshness

### Agent Orchestration
- 5 autonomous agents working together
- Ingestion: Extract concepts from documents
- Alignment: Normalize duplicate concepts
- Contradiction: Detect conflicting claims
- Curriculum: Generate learning paths
- Research: Find knowledge gaps

### Config-Driven Storage
**Switch backends by changing one variable:**
```env
STORAGE_TYPE=memory      # In-memory (default)
STORAGE_TYPE=mongodb     # MongoDB (with MONGODB_URI)
STORAGE_TYPE=neo4j       # Neo4j (with NEO4J_*)
STORAGE_TYPE=postgres    # PostgreSQL (with DATABASE_URL)
STORAGE_TYPE=qdrant      # Qdrant (with QDRANT_URL)
```

## 5. Useful Commands

### Reseed Demo Data
```bash
npx ts-node scripts/seed-demo-data.ts
```

### View Configuration
```bash
curl http://localhost:3000/api/health  # (create this endpoint to check config)
```

### Check Storage Status
Look at browser console or server logs when making API calls - storage initialization logs appear there.

## 6. Architecture at a Glance

```
Frontend (React)
    ↓
REST API Routes
    ↓
Services (Query, Knowledge Graph, Ingestion)
    ↓
Agents (5 autonomous agents)
    ↓
Storage Adapter
    ↓
Backend (Memory/MongoDB/Neo4j/etc)
```

## 7. Next Steps

### For Exploration
1. Try different searches: "gradient descent", "attention", "neural network"
2. Check the graph explorer to see relationships
3. View your skill progression on the heatmap

### For Development
1. Add custom concepts via `/api/nodes` POST
2. Ingest documents via agents
3. Run the full workflow to normalize knowledge
4. Switch storage backends for testing

### For Deployment
1. Change `STORAGE_TYPE=mongodb` (or your choice)
2. Add connection strings to `.env.local`
3. Run `npm run build && npm start`
4. Deploy to Vercel or your hosting

## 8. Common Issues

### "No concepts found"
- Default search is keyword-based
- Try: "gradient", "backprop", "neural", "transformer"
- Or use `/api/nodes` to list all

### Storage not persisting
- In-memory mode clears on restart
- Switch to MongoDB or PostgreSQL for persistence
- See `.env.example` for connection strings

### 404 on API endpoints
- Make sure Next.js is running (`npm run dev`)
- Check that files exist in `/app/api/`
- Restart dev server if files were added

### Slow queries
- In-memory adapter is O(n) for search
- For large datasets, use MongoDB with indexes
- Or use Neo4j for relationship queries

## 9. Architecture Highlights

### Type Safety
- Full TypeScript with strict mode
- Interfaces for all data structures
- Schema validation on storage

### Temporal Memory
- Exponential decay formula: `strength(t) = strength(0) * e^(-λΔt) + reinforcement`
- Configurable decay rates
- Reinforcement on access

### Multi-Layer Abstraction
- Storage layer: Abstract interface, multiple implementations
- Query layer: Semantic search independent of backend
- Agent layer: Autonomous, composable agents
- Frontend layer: Minimalist React interfaces

### Extensible Design
- Add new agents in `/lib/agents/`
- Create storage adapters in `/lib/storage/adapters/`
- Extend API routes in `/app/api/`
- Theme frontend with Tailwind customization

## 10. Production Checklist

- [ ] Choose persistent storage backend (MongoDB recommended)
- [ ] Set up environment variables in hosting platform
- [ ] Enable vector search (add embeddings provider)
- [ ] Configure agent auto-approval thresholds
- [ ] Set up monitoring/logging
- [ ] Test all 5 agents in your environment
- [ ] Seed production knowledge base
- [ ] Set up backup/restore procedures
- [ ] Configure CORS if needed
- [ ] Deploy and monitor

---

**That's it!** You now have a fully functional knowledge management system.

For detailed docs, see [README.md](./README.md).
For implementation details, check the source code in `/lib` and `/app`.
