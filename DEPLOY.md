# UAILS Deployment Guide

## Local Development

### Quick Start (2 minutes)
```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Visit http://localhost:3000
```

The system works **out of the box** with in-memory storage. No database setup required for testing.

---

## Production Deployment

### 1. Choose Your Storage Backend

**Option A: MongoDB (Recommended for most use cases)**
```env
STORAGE_TYPE=mongodb
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/uails
```

**Option B: PostgreSQL**
```env
STORAGE_TYPE=postgres
DATABASE_URL=postgresql://user:pass@host:5432/uails
```

**Option C: Neo4j (Best for graph reasoning)**
```env
STORAGE_TYPE=neo4j
NEO4J_URI=neo4j+s://host:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=password
```

**Option D: Qdrant (For vector search)**
```env
STORAGE_TYPE=qdrant
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=your-key
```

### 2. Vercel Deployment

#### Step 1: Push to GitHub
```bash
git add .
git commit -m "Add UAILS"
git push origin main
```

#### Step 2: Import to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Click "Add New..." → "Project"
3. Select your GitHub repo
4. Click "Import"

#### Step 3: Configure Environment
In Vercel Project Settings → Environment Variables:

```
STORAGE_TYPE=mongodb
MONGODB_URI=mongodb+srv://...
LOG_LEVEL=info
NODE_ENV=production
```

#### Step 4: Deploy
```bash
git push  # Auto-deploys via GitHub integration
```

Visit your deployment at: `https://your-project.vercel.app`

---

### 3. Docker Deployment

#### Single Container (With In-Memory Storage)
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
```

#### Docker Compose (With MongoDB)
```yaml
# docker-compose.yml
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

```bash
docker-compose up -d
```

---

### 4. AWS Deployment

#### Using EC2 + MongoDB Atlas

```bash
# SSH into EC2
ssh -i key.pem ec2-user@instance.ec2.amazonaws.com

# Install Node.js
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# Clone repo
git clone https://github.com/your/repo.git
cd repo

# Install & configure
npm install
cat > .env.production << 'EOF'
STORAGE_TYPE=mongodb
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/uails
NODE_ENV=production
PORT=80
EOF

# Build & start with PM2
npm install -g pm2
npm run build
pm2 start npm --name "uails" -- start
pm2 save
```

Enable PM2 on startup:
```bash
pm2 startup
pm2 save
```

---

### 5. Self-Hosted (Linux/Mac)

#### Nginx Reverse Proxy
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

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/uails /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# SSL with Let's Encrypt
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

---

## Data Seeding

### Seed Demo Data
```bash
npm run seed
```

This populates 10+ core AI/ML concepts with relationships.

### Custom Data
```bash
curl -X POST http://localhost:3000/api/nodes \
  -H "Content-Type: application/json" \
  -d '{
    "type": "concept",
    "name": "Your Concept",
    "description": "...",
    "level": { "abstraction": 0.7, "difficulty": 0.6, "volatility": 0.2 },
    ...
  }'
```

---

## Monitoring

### Health Check
```bash
curl https://your-app.vercel.app/api/health
```

Response:
```json
{
  "success": true,
  "status": "healthy",
  "storage": {
    "type": "mongodb",
    "ready": true,
    "healthy": true
  }
}
```

### Logs

**Vercel**: Dashboard → Deployments → Function Logs
**Docker**: `docker logs container-id`
**Self-hosted**: Check PM2 logs with `pm2 logs`

### Performance
- **Storage**: Monitor query times in logs
- **Memory**: Watch for memory leaks in production logs
- **API**: Set up monitoring with Sentry or DataDog (optional)

---

## Scaling

### For High Traffic

1. **Database**
   - Use MongoDB Atlas clusters (auto-scaling)
   - Add read replicas for queries
   - Enable sharding for large collections

2. **Caching**
   - Add Redis for query results
   - Cache frequently accessed nodes
   - Configure with Upstash

3. **Frontend**
   - Enable CDN (Vercel provides free CDN)
   - Optimize images with `next/image`
   - Use static exports where possible

4. **Agents**
   - Run agents asynchronously
   - Use job queues (Bull, RQ)
   - Batch processing for large ingestions

### Recommended Production Stack
```
Frontend: Vercel (auto-scaling)
Backend: Vercel (auto-scaling) or EC2
Storage: MongoDB Atlas (cloud)
Vectors: Qdrant Cloud
Cache: Redis/Upstash
CDN: Vercel CDN
```

---

## Security Checklist

- [ ] Set strong MongoDB passwords
- [ ] Enable HTTPS/SSL
- [ ] Use environment variables (never hardcode secrets)
- [ ] Add CORS headers if needed
- [ ] Rate limit API endpoints
- [ ] Validate all inputs
- [ ] Keep dependencies updated (`npm audit`)
- [ ] Monitor for vulnerabilities
- [ ] Use API keys for agents (future)
- [ ] Backup database regularly

---

## Troubleshooting

### Build Fails
```bash
# Clear cache
rm -rf .next node_modules
npm install
npm run build
```

### Storage Connection Error
- Verify connection string is correct
- Check database is running and accessible
- Review logs for detailed error messages

### Slow Queries
- Add database indexes
- Use MongoDB Compass to analyze queries
- Consider switching to Neo4j for graph queries

### Memory Issues
- Increase Node.js heap: `NODE_OPTIONS=--max-old-space-size=4096`
- Monitor with `top` or PM2 web dashboard
- Implement query pagination

---

## Rollback

### Vercel
```bash
# Previous deployment auto-available
# Click "..." → "Redeploy"
```

### Manual Backup
```bash
# Backup MongoDB
mongodump --uri "mongodb+srv://..." --out ./backup

# Restore
mongorestore ./backup
```

---

## Cost Estimates

| Service | Free Tier | Production |
|---------|-----------|-----------|
| Vercel | 3 deployments/mo | $20/mo |
| MongoDB Atlas | 512MB storage | $57/mo cluster |
| Qdrant Cloud | - | $25/mo |
| Upstash Redis | 10,000 cmds/day | $80/mo |
| Total | Free | ~$200-300/mo |

---

## Support & Troubleshooting

1. **Check logs** first (Vercel Dashboard / PM2)
2. **Visit health endpoint**: `/api/health`
3. **Review** `.env` configuration
4. **Test locally** with `npm run dev`
5. **Read** QUICKSTART.md, SETUP.md, ARCHITECTURE.md

---

**Happy deploying!** 🚀
