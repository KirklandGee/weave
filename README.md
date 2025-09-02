<div align="center">
  <img src="logo.png" alt="Weave Logo" width="200">
</div>

# Weave

A comprehensive campaign management tool for tabletop RPGs, built with Next.js and FastAPI. Organize your campaigns, characters, locations, lore, and their interconnected relationships through an intuitive markdown editor, built on top of a graph database for the best AI assistance. Check it out here: [Weave](https://use-weave.app)

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-0.1.0-green.svg)


## ✨ Features

### 🎲 Campaign Management
- **Multi-campaign support** - Create and manage multiple RPG campaigns
- **Campaign isolation** - Each campaign has its own secure data space
- **Real-time switching** - Switch between campaigns instantly

### 📚 Content Organization
- **Rich text editor** - Powered by TipTap with markdown support
- **Flexible content types** - Notes, Characters, Locations, Sessions, and Lore
- **Graph relationships** - Connect any content with meaningful relationships
- **Full-text search** - Find content quickly across your entire campaign

### 🤖 AI Integration
- **Smart content generation** - AI-powered NPCs, locations, and items
- **Contextual assistance** - AI understands your campaign's context
- **Embedding search** - Semantic search across all content

### 🔍 Advanced Features
- **Command palette** - Quick access with Cmd+K
- **Offline-first** - Works without internet, syncs when connected
- **Visual relationships** - See connections between content
- **Type safety** - Built with TypeScript throughout

## 🏗️ Architecture

### Frontend Stack
- **Next.js 15** - React framework with App Router
- **React 19** - Latest React with concurrent features
- **TypeScript** - Full type safety
- **Tailwind CSS** - Utility-first styling
- **IndexedDB/Dexie** - Local-first data storage

### Backend Stack
- **FastAPI** - High-performance Python API
- **Neo4j** - Graph database for relationships
- **Redis** - Task queue and caching
- **Clerk** - Authentication and user management
- **LangChain** - AI integration framework

## 🚀 Getting Started

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for local development)
- Python 3.13+ (for local backend development)

### Environment Setup

1. **Clone the repository**
```bash
git clone https://github.com/KirklandGee/weave
cd weave
```

2. **Set up environment variables**
```bash
cp .env.example .env
```

Configure the following variables in `.env`:
```env
# Authentication (required)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
CLERK_SECRET_KEY=sk_test_your_secret_here

# AI Services (optional but recommended)
OPENAI_API_KEY=sk-your_openai_key_here
GOOGLE_API_KEY=your_google_api_key_here

# Observability (optional)
LANGFUSE_PUBLIC_KEY=pk-lf-your_key_here
LANGFUSE_SECRET_KEY=sk-lf-your_secret_here
LANGFUSE_HOST=https://cloud.langfuse.com
```

### 🐳 Docker Deployment (Recommended)

#### Production Deployment
```bash
# Build and start all services
npm run docker:prod

# Or manually with docker-compose
docker-compose -f docker-compose.prod.yml up --build
```

#### Development with Docker
```bash
# Start with hot reload
npm run docker:dev

# Or manually
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

#### Service URLs
- **Main App**: http://localhost:3001
- **Marketing Site**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **Neo4j Browser**: http://localhost:7474 (neo4j/secretgraph - dev only)

### 🛠️ Local Development

#### Backend Setup
```bash
cd backend
pip install uv  # Modern Python package manager
uv sync         # Install dependencies
uv run python -m fastapi dev api/index.py --port 8000
```

#### Frontend Setup
```bash
# Install dependencies
npm install

# Start development servers
npm run dev     # Both app and marketing
# Or individually:
npm run dev:app      # Main app on :3001
npm run dev:marketing # Marketing on :3000
```

## 📊 Database Setup

### Initial Database Seeding
```bash
# Seed the Neo4j database with initial schema
npm run docker:seed

# Or manually
docker-compose run --rm seeder
```

### Database Management
```bash
# View logs
npm run docker:logs

# Reset everything
npm run docker:down:volumes

# Backend services only
npm run docker:backend
```

## 🔧 Configuration

### Docker Services

| Service | Description | Port | Dependencies |
|---------|-------------|------|--------------|
| `app` | Main Next.js application | 3001 | backend |
| `marketing` | Marketing website | 3000 | - |
| `backend` | FastAPI Python backend | 8000 | neo4j, redis |
| `rq-worker` | Background task processor | - | backend, redis |
| `neo4j` | Graph database | 7474, 7687 | - |
| `redis` | Task queue & caching | 6379 | - |

### Authentication Setup

1. **Create a Clerk account** at [clerk.com](https://clerk.com)
2. **Create a new application**
3. **Copy your keys** to the environment variables
4. **Configure allowed origins** in Clerk dashboard:
   - `http://localhost:3000` (marketing)
   - `http://localhost:3001` (app)
   - Your production domain

### AI Services Setup

#### OpenAI
1. Get API key from [platform.openai.com](https://platform.openai.com)
2. Add to `OPENAI_API_KEY` in `.env`

#### Google AI (Optional)
1. Get API key from [Google AI Studio](https://aistudio.google.com)
2. Add to `GOOGLE_API_KEY` in `.env`

## 📚 Usage

### Creating Your First Campaign
1. Sign up/login with Clerk authentication
   a. If you want to make use of the AI features, you'll need to either remove the checks for or upgrade your account in Clerk to a higher tier.
2. Click "New Campaign" in the sidebar
3. Give it a name and description
4. Start creating content!


### AI Features
- **Character Generation**: Create detailed NPCs
- **Location Building**: Generate immersive locations
- **Session Planning**: AI-assisted session prep
- **Content Summarization**: Auto-generate summaries


## 🔍 Development

### Code Structure
```
ai-rpg-manager/
├── apps/
│   ├── app/          # Main Next.js application
│   └── marketing/    # Marketing website
├── backend/          # FastAPI Python backend
│   ├── api/         # API routes
│   ├── services/    # Business logic
│   └── models/      # Data models
├── docker-compose.* # Docker configurations
└── package.json     # Workspace configuration
```

### Available Commands
```bash
# Development
npm run dev              # Start all development servers
npm run dev:app          # App only
npm run dev:marketing    # Marketing only

# Building
npm run build           # Build all workspaces
npm run build:app       # App only
npm run build:marketing # Marketing only

# Docker
npm run docker:dev      # Development with Docker
npm run docker:prod     # Production deployment
npm run docker:seed     # Seed database

# Code Quality
npm run lint            # Lint all code
npm run format          # Format all code
npm run format:check    # Check formatting
```

## 📈 Monitoring & Observability

### Langfuse Integration
- **LLM call tracking** - Monitor AI usage
- **Performance metrics** - Response times and costs
- **Error tracking** - Debug AI issues
- **Usage analytics** - Understand user patterns

### Health Checks
- **Backend**: http://localhost:8000/health
- **Database**: Neo4j browser at http://localhost:7474

## 🚀 Production Deployment

### Environment Variables for Production
```env
# Set secure passwords
NEO4J_PASSWORD=your_secure_password_here

# Production URLs
BACKEND_URL=https://api.yourdomain.com
NEXT_PUBLIC_APP_URL=https://app.yourdomain.com

# Enable production optimizations
NODE_ENV=production
ENVIRONMENT=production
```

### Scaling Considerations
- **Backend**: Increase workers in Dockerfile CMD
- **Database**: Use Neo4j Enterprise for clustering
- **Redis**: Use Redis Cluster for high availability
- **Frontend**: Deploy to CDN (Vercel, Netlify, etc.)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript strict mode
- Use conventional commits
- Update documentation

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙋‍♂️ Support

### Community
- **Issues**: [GitHub Issues](https://github.com/your-org/ai-rpg-manager/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-org/ai-rpg-manager/discussions)

### Hosted Service
Looking for a hassle-free experience? We offer a fully managed hosted version at [use-weave.app](https://use-weave.app) with:
- ✅ Automatic updates and maintenance
- ✅ Scalable infrastructure
- ✅ Premium AI features
- ✅ Priority support
- ✅ Collaborative campaigns

---

Built with ❤️ for the tabletop RPG community