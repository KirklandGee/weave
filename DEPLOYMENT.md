# Deployment Guide

This guide covers deploying the AI RPG Manager to production using Railway for backend services and Vercel for the frontend.

## Architecture Overview

- **Frontend (Next.js)**: Deployed on Vercel
- **Backend API (FastAPI)**: Deployed on Railway
- **Background Worker (RQ)**: Deployed on Railway
- **Neo4j Database**: Deployed on Railway
- **Redis Cache**: Deployed on Railway

## Prerequisites

1. **Railway Account**: Sign up at [railway.app](https://railway.app)
2. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
3. **GitHub Repository**: Push this code to GitHub
4. **Environment Variables**: Prepare all required environment variables

## Required Environment Variables

### Shared Variables (Backend + Worker)
```
NEO4J_URI=<railway-neo4j-connection-string>
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=<strong-password>
REDIS_URL=<railway-redis-connection-string>
CLERK_SECRET_KEY=<your-clerk-secret-key>
OPENAI_API_KEY=<your-openai-api-key>
LANGFUSE_SECRET_KEY=<your-langfuse-secret-key>
LANGFUSE_PUBLIC_KEY=<your-langfuse-public-key>
LANGFUSE_HOST=<your-langfuse-host>
FRONTEND_URL=<your-vercel-app-url>
FRONTEND_DOMAIN=<your-custom-domain>
```

### Frontend Variables (Vercel)
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=<your-clerk-publishable-key>
CLERK_SECRET_KEY=<your-clerk-secret-key>
BACKEND_URL=<your-railway-backend-url>
```

## Deployment Steps

### 1. Deploy Database Services

#### Option A: Railway Neo4j (Quick Start)
1. Create new Railway project
2. Add service → Database → Neo4j
3. Set environment variables:
   - `NEO4J_AUTH=neo4j/<strong-password>`
   - `NEO4J_dbms_security_procedures_unrestricted=gds.*,apoc.*`
   - `NEO4J_dbms_security_procedures_allowlist=gds.*,apoc.*`
   - `NEO4J_PLUGINS=["apoc"]`
4. Note the connection string for backend services

#### Option B: Neo4j Aura (Production Recommended)
1. Sign up at [neo4j.com/aura](https://neo4j.com/aura)
2. Create new database instance
3. Choose region closest to your Railway deployment
4. Note connection string: `neo4j+s://xxx.databases.neo4j.io`
5. Download credentials and save securely

#### Option C: Self-Hosted
1. Deploy Neo4j container on DigitalOcean/AWS
2. Configure security groups and SSL
3. Set up automated backups
4. Use connection string: `bolt://your-server:7687`

#### Redis
1. In same Railway project, add service → Database → Redis
2. Note the connection string for backend services

### 2. Deploy Backend API on Railway

1. Add service → GitHub Repo → Select your repository
2. Configure build settings:
   - **Build Command**: `cd backend && uv sync --frozen --no-cache --no-dev`
   - **Start Command**: `cd backend && uv run python -m fastapi run api/index.py --host 0.0.0.0 --port $PORT`
   - **Root Directory**: `/`
3. Add all backend environment variables
4. Deploy and note the service URL

### 3. Deploy Background Worker on Railway

The RQ worker processes background tasks like template generation and LLM operations.

#### Method A: Using Railway JSON Config (Recommended)
1. In your Railway project, add new service from GitHub repo
2. In **Service Settings**:
   - **Name**: `rq-worker`
   - **Source**: Same GitHub repository
   - **Root Directory**: `/` (leave blank)
3. Upload `worker-railway.json` to root of your repo
4. Railway will automatically detect and use this config
5. Add same environment variables as backend API:
   ```
   REDIS_URL=${{Redis.REDIS_URL}}
   NEO4J_URI=${{Neo4j.NEO4J_URI}}
   NEO4J_USERNAME=neo4j
   NEO4J_PASSWORD=${{Neo4j.NEO4J_PASSWORD}}
   CLERK_SECRET_KEY=<your-clerk-secret>
   OPENAI_API_KEY=<your-openai-key>
   LANGFUSE_SECRET_KEY=<your-langfuse-secret>
   LANGFUSE_PUBLIC_KEY=<your-langfuse-public>
   LANGFUSE_HOST=<your-langfuse-host>
   ```

#### Method B: Manual Configuration
1. Add new service from same GitHub repo
2. **Build Settings**:
   - **Build Command**: (leave blank - uses Dockerfile)
   - **Start Command**: `cd backend && uv run python worker.py`
   - **Dockerfile Path**: `backend/Dockerfile`
3. Add environment variables (same as above)
4. Deploy

#### Monitoring Worker Health
The worker logs will show:
```
INFO - Starting RQ worker 'worker-<pid>' listening on queues: ['priority', 'default', 'long_running']
INFO - Worker PID: <process-id>
```

#### Worker Features
- **Multiple Queues**: Processes `priority`, `default`, and `long_running` queues
- **Graceful Shutdown**: Handles SIGTERM/SIGINT properly
- **Auto-restart**: Railway restarts on failure
- **Job Scheduling**: Supports scheduled/delayed jobs

### 4. Initialize Database

After backend services are running:

1. Connect to your Railway Neo4j instance
2. Run the seed scripts from `backend/db/seed_data/`
3. Or use the Railway console to run: `docker-compose run --rm seeder`

### 5. Deploy Frontend on Vercel

#### Option A: Automatic Deployment
1. Connect your GitHub repository to Vercel
2. Set **Root Directory** to `apps/app`
3. Configure environment variables in Vercel dashboard
4. Deploy

#### Option B: Manual Deployment
1. Install Vercel CLI: `npm i -g vercel`
2. Navigate to `apps/app`
3. Run `vercel --prod`
4. Follow prompts and configure environment variables

### 6. Configure Custom Domain (Optional)

#### Vercel
1. Go to Project Settings → Domains
2. Add your custom domain
3. Configure DNS records as instructed

#### Railway
1. Go to each service → Settings → Domains
2. Add custom domain for API if needed
3. Update CORS configuration in backend

## Post-Deployment Configuration

### 1. Update CORS Origins
Ensure your backend includes your production domain in CORS origins:
```python
# In backend/api/index.py, these are automatically configured:
FRONTEND_URL=https://your-app.vercel.app
FRONTEND_DOMAIN=your-custom-domain.com
```

### 2. Verify Services
- **Backend Health**: `https://your-backend.railway.app/health`
- **Frontend**: `https://your-app.vercel.app`
- **Database**: Connect via Neo4j Browser

### 3. Monitor Logs
- **Railway**: View logs in Railway dashboard
- **Vercel**: View function logs in Vercel dashboard

## Environment-Specific Notes

### Railway Considerations
- Services are automatically restarted on failure
- Environment variables are encrypted
- Private networking between services is automatic
- Each service gets its own subdomain

### Vercel Considerations
- Static generation is optimized automatically
- API routes run as serverless functions
- Environment variables are available at build and runtime
- Automatic HTTPS and CDN

## Troubleshooting

### Common Issues

1. **CORS Errors**: Verify FRONTEND_URL and FRONTEND_DOMAIN are set correctly
2. **Database Connection**: Check NEO4J_URI and credentials
3. **API Timeout**: Increase Vercel function timeout in vercel.json
4. **Build Failures**: Check build logs and dependency versions

### Useful Commands

```bash
# Test backend locally with production env
cd backend && uv run python -m fastapi dev api/index.py

# Test frontend build
cd apps/app && npm run build

# Check Railway logs
railway logs --service=backend

# Check Vercel logs
vercel logs --prod
```

## Security Notes

- All environment variables are encrypted at rest
- Use strong passwords for database connections
- Keep API keys secure and rotate regularly
- Enable authentication in production
- Use HTTPS for all communications

## Scaling Considerations

- Railway autoscales based on resource usage
- Vercel handles frontend scaling automatically
- Consider Redis caching for high-traffic scenarios
- Monitor database performance and add indexes as needed

## Database Migration Path

### Railway → Neo4j Aura Migration
When ready to upgrade to production-grade database:

1. **Export data from Railway Neo4j**:
   ```bash
   # Connect to Railway Neo4j and export
   neo4j-admin dump --database=neo4j --to=/tmp/neo4j.dump
   ```

2. **Import to Neo4j Aura**:
   ```bash
   # Upload dump to Aura instance
   neo4j-admin load --from=/tmp/neo4j.dump --database=neo4j --force
   ```

3. **Update environment variables**:
   - Change `NEO4J_URI` to Aura connection string
   - Update credentials
   - Test connection

4. **Zero-downtime migration**:
   - Set up Aura instance
   - Sync data during low-traffic period  
   - Switch connection string
   - Monitor for issues

### Cost Comparison
- **Railway Neo4j**: ~$5-10/month (limited features)
- **Neo4j Aura**: ~$65/month (full features, managed)
- **Self-hosted**: ~$20-40/month (requires management)