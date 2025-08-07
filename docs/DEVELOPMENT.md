# Development Setup Guide

This monorepo contains both the AI RPG Manager app and its marketing site, structured for easy local development with subdomain routing.

## Project Structure

```
ai_rpg_manager/
├── apps/
│   ├── app/          # Main application (formerly frontend/)
│   └── marketing/    # Marketing landing page
├── backend/          # FastAPI backend
└── scripts/          # Development utilities
```

## Quick Start

### Option 1: Docker Development (Recommended)

The easiest way to get started is using Docker, which handles all dependencies and services automatically.

#### Prerequisites
- Docker and Docker Compose installed
- Copy `.env.example` to `.env` and fill in your API keys

#### Start Everything
```bash
# Copy environment template
cp .env.example .env
# Edit .env with your API keys (CLERK_SECRET_KEY, OPENAI_API_KEY, etc.)

# Start all services
npm run docker:up:build

# (Optional) Seed database with sample data
npm run docker:seed
```

This will start:
- **Frontend App**: http://localhost:3001
- **Marketing Site**: http://localhost:3000  
- **Backend API**: http://localhost:8000
- **Neo4j Browser**: http://localhost:7474 (neo4j/password)
- **Redis**: localhost:6379
- **RQ Worker**: Background task processor

#### Useful Docker Commands
```bash
npm run docker:up:build    # Start with rebuild
npm run docker:up          # Start (use existing images)
npm run docker:down        # Stop all services
npm run docker:down:volumes # Stop and remove data volumes
npm run docker:logs        # View logs from all services
npm run docker:backend     # Start only backend services
npm run docker:frontend    # Start only frontend services
npm run docker:seed        # Seed Neo4j with sample data
```

### Option 2: Local Development

If you prefer to run services locally:

#### Prerequisites
- Node.js 20+
- Python 3.13+
- Redis server
- Neo4j database

#### 1. Install Dependencies

```bash
npm install
cd backend && uv sync
```

#### 2. Setup Local Subdomain (Optional)

For full subdomain testing, run:

```bash
./scripts/setup-hosts.sh
```

This adds `app.localhost` to your `/etc/hosts` file.

#### 3. Start Development Servers

Choose one of these options:

#### Option A: Run Both Apps Separately
```bash
# Terminal 1 - Marketing site (port 3000)
npm run dev:marketing

# Terminal 2 - Main app (port 3001)  
npm run dev:app

# Terminal 3 - Backend (port 8000)
cd backend && uvicorn api.index:app --reload
```

#### Option B: Run Both Apps Concurrently
```bash
npm run dev
```

#### Option C: Use Proxy Server (Recommended)
```bash
# Terminal 1 - Start both apps
npm run dev

# Terminal 2 - Start proxy server
npm run dev:proxy

# Terminal 3 - Backend
cd backend && uvicorn api.index:app --reload
```

## Access Points

### Without Proxy
- Marketing site: http://localhost:3000
- Main app: http://localhost:3001
- Backend API: http://localhost:8000

### With Proxy (Port 3080)
- Marketing site: http://localhost:3080
- Main app: http://app.localhost:3080
- Backend API: http://localhost:8000

## Development Workflow

1. **Marketing Site Changes**: Edit files in `apps/marketing/`
2. **App Changes**: Edit files in `apps/app/`
3. **Backend Changes**: Edit files in `backend/`
4. **Shared Configuration**: Root-level `package.json` manages workspaces

## Backend Integration

The backend is configured with CORS for all development origins:
- `http://localhost:3000` (marketing)
- `http://localhost:3001` (app)
- `http://app.localhost:3001` (app via subdomain)
- `http://localhost:3080` (proxy)
- `http://app.localhost:3080` (proxy with subdomain)

## Building for Production

```bash
# Build both apps
npm run build

# Build individually
npm run build:app
npm run build:marketing
```

## Redis Queue System

This project uses Redis Queue (RQ) for background task processing, particularly for async template generation.

### Key Components
- **Redis**: Task queue storage
- **RQ Worker**: Processes background tasks 
- **Task API**: `/template/{name}/async` and `/template/status/{task_id}`

### Monitoring Tasks
```bash
# View all Docker logs including worker
npm run docker:logs

# Connect to Redis CLI (if running locally)
redis-cli monitor

# View queue status in Python
python -c "from backend.services.queue_service import get_queue_stats; print(get_queue_stats())"
```

### Development Notes
- Template execution is now async-only (no streaming endpoints)
- Tasks include progress tracking and intermediate status updates
- Failed jobs are automatically retried by RQ
- Worker runs in separate Docker container for isolation

## Troubleshooting

### Subdomain Not Working
- Verify `/etc/hosts` contains: `127.0.0.1 app.localhost`
- Clear browser cache
- Try different browser

### Port Conflicts
- Check if ports 3000, 3001, 3080, 6379, 7474, 7687, 8000 are available
- Update port numbers in scripts if needed

### CORS Issues
- Ensure backend is running on port 8000
- Check CORS configuration in `backend/api/index.py`

### Redis/Queue Issues
- Check Redis container is running: `docker-compose ps redis`
- Verify worker is processing: `docker-compose logs rq-worker`
- Restart queue services: `docker-compose restart redis rq-worker backend`

### Database Issues
- Neo4j web interface: http://localhost:7474 (neo4j/password)
- Reset all data: `npm run docker:down:volumes && npm run docker:up:build`
- Reseed database: `npm run docker:seed`
- Check if data persists: Data is stored in Docker volumes and persists between restarts

### Database Seeding
- **Persistent data**: Neo4j data persists in Docker volumes between runs
- **First-time setup**: Run `npm run docker:seed` to populate with sample data
- **Manual seeding**: From `backend/db/` directory, run `./seed.sh` (requires local cypher-shell)
- **Reset and reseed**: `npm run docker:down:volumes && npm run docker:up:build && npm run docker:seed`