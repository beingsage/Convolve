# UAILS Documentation Index

Welcome to UAILS - a production-grade knowledge management system. Start here to find what you need.

---

## 🚀 Getting Started (Pick One)

### **I just want to run it** (2 minutes)
→ Read [`QUICKSTART.md`](./QUICKSTART.md)  
Start the app, explore interfaces, understand core features.

### **I want to understand setup & config** (5 minutes)
→ Read [`SETUP.md`](./SETUP.md)  
Configure storage backends, seed data, environment variables.

### **I need the quick reference**
→ Read [`REFERENCE.md`](./REFERENCE.md)  
Commands, API endpoints, code snippets, troubleshooting.

---

## 📚 Understanding the System

### **What's actually built?** (System overview)
→ Read [`SYSTEM_OVERVIEW.md`](./SYSTEM_OVERVIEW.md)  
Architecture, file structure, tech stack, what's production-ready.

### **How does it work internally?** (Deep technical dive)
→ Read [`ARCHITECTURE.md`](./ARCHITECTURE.md)  
Data models, storage layer, agents, services, design patterns.

### **How do I deploy this?** (Production guide)
→ Read [`DEPLOY.md`](./DEPLOY.md)  
Vercel, Docker, AWS, self-hosted, scaling, monitoring.

---

## 🎯 Common Scenarios

### I want to...

**Start developing locally**
1. `npm install`
2. `npm run dev`
3. Visit http://localhost:3000
4. Read [`QUICKSTART.md`](./QUICKSTART.md)

**Add a custom concept**
1. Use API: `POST /api/nodes` (see [`REFERENCE.md`](./REFERENCE.md))
2. Or use frontend: Visit `/query` and explore

**Switch storage backend**
1. Edit `.env` or `.env.local`
2. Set `STORAGE_TYPE=mongodb` (or postgres/neo4j/qdrant)
3. Add connection string
4. Restart with `npm run dev`
5. Details in [`SETUP.md`](./SETUP.md)

**Deploy to production**
1. Choose platform (Vercel/Docker/self-hosted)
2. Follow [`DEPLOY.md`](./DEPLOY.md)
3. Set environment variables
4. Deploy!

**Run ingestion agent**
1. See API examples in [`REFERENCE.md`](./REFERENCE.md)
2. Or read agent code in `/lib/agents/`

**Generate learning paths**
1. Call `/api/agents` with action=curriculum
2. Or use frontend at `/paths`
3. Examples in [`REFERENCE.md`](./REFERENCE.md)

**Understand the data models**
1. See TypeScript definitions in [`REFERENCE.md`](./REFERENCE.md)
2. Or read `/lib/types/index.ts` directly

**Troubleshoot an issue**
1. Check [`REFERENCE.md`](./REFERENCE.md) troubleshooting section
2. See logs: `npm run dev` output
3. Check health: `curl http://localhost:3000/api/health`

---

## 📖 Full Documentation Tree

```
DOCS.md (you are here)
│
├─ QUICKSTART.md ..................... Get running in 2 minutes
├─ SETUP.md .......................... Configuration & environment
├─ REFERENCE.md ...................... Commands, APIs, code snippets
│
├─ SYSTEM_OVERVIEW.md ................ What's been built & how
├─ ARCHITECTURE.md ................... Technical deep dive
├─ DEPLOY.md ......................... Production deployment guide
│
├─ README.md ......................... Full feature overview
└─ .env.example ....................... Configuration template
```

---

## 🏗️ Architecture Quick View

```
Frontend                  │ React 19 + Tailwind
                         │ 4 complete interfaces
API Routes              │ /query, /nodes, /agents, /health
Services                │ Query, Graph, Decay, Semantic
Agents                  │ 5 autonomous agents
Storage Adapter         │ In-Memory, MongoDB, Neo4j, etc.
```

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for complete diagram.

---

## 🔧 What You Can Do

### Immediately (No setup required)
- Run `npm run dev` and explore the demo
- Search for concepts in `/query`
- View the knowledge graph in `/graph`
- Check your skill level in `/skills`
- Generate learning paths in `/paths`

### With API Calls
- Search: `GET /api/query?q=...`
- List concepts: `GET /api/nodes`
- Create concepts: `POST /api/nodes`
- Run agents: `POST /api/agents`

### With Development
- Add custom concepts
- Ingest documents
- Create relationships
- Run agents in sequence
- Switch storage backends

### With Deployment
- Deploy to Vercel
- Run with Docker
- Self-host on any server
- Scale to production

---

## 📦 What's Included

**Backend**
- ✅ Type system (40+ interfaces)
- ✅ Storage adapters (5+)
- ✅ Core services (ingestion, graph, query, decay)
- ✅ 5 autonomous agents
- ✅ REST API (4 routes)
- ✅ Health checks

**Frontend**
- ✅ Semantic query interface
- ✅ Knowledge graph explorer
- ✅ Skill heatmap
- ✅ Learning paths
- ✅ Minimalist design (no bloat)

**Demo**
- ✅ 10 pre-seeded concepts
- ✅ 20+ relationships
- ✅ Ready-to-explore data

**Docs**
- ✅ 6 markdown guides
- ✅ REFERENCE card
- ✅ Code comments
- ✅ TypeScript definitions

---

## 🎓 Learning Path

1. **Read QUICKSTART.md** (understand what it does)
2. **Run `npm run dev`** (see it working)
3. **Explore the 4 interfaces** (use it interactively)
4. **Read SETUP.md** (understand config options)
5. **Try API calls** (use REFERENCE.md)
6. **Read ARCHITECTURE.md** (understand internals)
7. **Deploy with DEPLOY.md** (go to production)

---

## 🔍 Find Something Specific

| I want to... | Go to... |
|--------------|----------|
| Run the app | QUICKSTART.md |
| Configure storage | SETUP.md |
| Find API docs | REFERENCE.md |
| Understand the design | SYSTEM_OVERVIEW.md |
| Learn internals | ARCHITECTURE.md |
| Deploy to production | DEPLOY.md |
| Quick lookup | REFERENCE.md |
| Full overview | README.md |
| All options | This file |

---

## ❓ FAQ

**Q: Do I need to set up a database?**  
A: No! It works out-of-the-box with in-memory storage. For production, add MongoDB/PostgreSQL/Neo4j via `.env`.

**Q: How do I add my own data?**  
A: Use the API (`POST /api/nodes`) or the frontend. See REFERENCE.md for examples.

**Q: Can I switch storage backends later?**  
A: Yes! Just change `STORAGE_TYPE` in `.env` and restart.

**Q: Is this production-ready?**  
A: Core system is. See SYSTEM_OVERVIEW.md for what's ready vs. what needs extension.

**Q: How do the agents work?**  
A: They're autonomous services. See ARCHITECTURE.md for details or REFERENCE.md for API examples.

**Q: Can I deploy this?**  
A: Yes! See DEPLOY.md for Vercel, Docker, AWS, or self-hosted options.

**Q: Where's the code?**  
A: `/lib` (backend) and `/app` (frontend). Types in `/lib/types/index.ts`.

---

## 📞 Support

1. **Check logs**: Run with `npm run dev` to see detailed output
2. **Read the guide**: Your question is probably answered above
3. **API reference**: See REFERENCE.md for all endpoints
4. **Code**: Everything is well-commented TypeScript

---

## 🎯 Next Step

**→ Choose a starting point from the "Getting Started" section above**

Or jump straight to:
- **`QUICKSTART.md`** if you want to see it running in 2 minutes
- **`REFERENCE.md`** if you want code snippets and commands
- **`ARCHITECTURE.md`** if you want to understand the design

---

**Happy exploring!** 🚀

UAILS treats knowledge as living, dynamic entities. Start with the demo, explore the interfaces, then make it your own.
