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

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Local Subdomain (Optional)

For full subdomain testing, run:

```bash
./scripts/setup-hosts.sh
```

This adds `app.localhost` to your `/etc/hosts` file.

### 3. Start Development Servers

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

## Troubleshooting

### Subdomain Not Working
- Verify `/etc/hosts` contains: `127.0.0.1 app.localhost`
- Clear browser cache
- Try different browser

### Port Conflicts
- Check if ports 3000, 3001, 3080, 8000 are available
- Update port numbers in scripts if needed

### CORS Issues
- Ensure backend is running on port 8000
- Check CORS configuration in `backend/api/index.py`