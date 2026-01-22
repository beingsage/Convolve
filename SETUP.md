# UAILS Setup & Running

## Quick Start (2 minutes)

### Prerequisites
- Node.js 18+
- npm or yarn

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Storage (Optional)
By default, UAILS uses in-memory storage (no setup needed).

To use MongoDB:
```bash
# .env or .env.local
STORAGE_TYPE=mongodb
MONGODB_URI=mongodb://localhost:27017/uails
```

### 3. Seed Demo Data
The demo data (10 AI/ML concepts) can be seeded during first run, or manually:

```bash
# Using npm scripts (recommended)
npm run seed

# Or directly with Node
node -e "
  const InMemoryAdapter = require('./lib/storage/adapters/memory.ts').InMemoryAdapter;
  const storage = new InMemoryAdapter({ type: 'memory' });
  console.log('In-memory storage initialized');
"
```

### 4. Run the Development Server
```bash
npm run dev
```

Visit: http://localhost:3000

### 5. Explore the System

**Semantic Query** (http://localhost:3000/query)
- Search: "What is backpropagation?"
- See: Concepts, relationships, real-world usage

**Knowledge Graph** (http://localhost:3000/graph)
- Visualize: Node connections
- View: Dependency chains

**Skill Heatmap** (http://localhost:3000/skills)
- See: Your mastery levels
- Review: Recommended next concepts

**Learning Paths** (http://localhost:3000/paths)
- Generate: Personalized curricula
- Track: Progress through AI/ML topics

---

## Troubleshooting

### Error: "Storage adapter not initialized"
**Solution**: Make sure `.env.local` or `.env` exists. Default is in-memory storage.

```bash
cp .env.example .env.local
npm run dev
```

### Error: "MongoDB connection failed"
**Check**:
- Is MongoDB running? `mongosh` or `mongo`
- Is `MONGODB_URI` correct in .env?
- For Docker: `docker run -d -p 27017:27017 mongo`

### Error: "Cannot find module TypeScript"
**Solution**: Use `tsx` instead of `ts-node`:
```bash
npx tsx scripts/seed-demo-data.ts
```

---

## Configuration Options

Edit `.env` or `.env.local`:

```
# Storage Backend
STORAGE_TYPE=memory            # memory, mongodb, postgres, neo4j, qdrant
MONGODB_URI=mongodb://...      # Only for mongodb

# API Server
PORT=3000
NODE_ENV=development

# Logging
LOG_LEVEL=info                 # debug, info, warn, error
```

---

## Architecture Quick Reference

| Component | Role | Tech |
|-----------|------|------|
| **Types** | Data schemas | TypeScript |
| **Storage** | Persistence layer | In-Memory, MongoDB, etc. |
| **Services** | Core logic | Ingestion, Graph, Semantic |
| **Agents** | Autonomous modules | Ingestion, Alignment, Curriculum, etc. |
| **API Routes** | Backend endpoints | Next.js |
| **Frontend** | User interfaces | React + Tailwind |

---

## Next Steps

1. **Explore**: Visit all 4 frontend pages
2. **Understand**: Read ARCHITECTURE.md
3. **Extend**: Add a custom concept via API
4. **Switch Backend**: Change `STORAGE_TYPE` to MongoDB/PostgreSQL
5. **Deploy**: Use Docker or Vercel

---

## Support

- **Docs**: See README.md, ARCHITECTURE.md, QUICKSTART.md
- **Code**: Fully typed TypeScript with JSDoc
- **Issues**: Check error logs in console

Happy learning! 🚀
