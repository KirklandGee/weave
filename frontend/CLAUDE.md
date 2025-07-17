# AI RPG Manager - Project Overview

## Project Description
A comprehensive campaign management tool for tabletop RPGs, built with Next.js and React. The application allows users to create and manage multiple campaigns, characters, locations, lore, and their interconnected relationships through a graph-based data structure.

## Tech Stack

### Frontend Framework
- **Next.js 15.3.5** - React framework with App Router
- **React 18** - UI library with hooks and context
- **TypeScript** - Type safety and enhanced developer experience
- **Tailwind CSS** - Utility-first CSS framework for styling

### Database & Storage
- **Neo4j** - Graph database for storing nodes and relationships (backend)
- **IndexedDB** - Browser-based local storage via Dexie.js
- **Dexie.js** - IndexedDB wrapper for reactive queries and offline-first architecture

### Authentication & User Management
- **Clerk** - Authentication service with JWT tokens
- User sessions managed through `@clerk/nextjs`

### Backend API
- **FastAPI** (Python) - REST API backend
- **Neo4j driver** - Database connectivity
- Custom authentication middleware using Clerk tokens

### UI Components & Styling
- **Lucide React** - Icon library
- **Allotment** - Resizable panel layouts
- Custom component library with dark theme support
- Responsive design with mobile considerations

### Editor & Content
- **Tiptap** - Rich text editor for markdown content
- **Markdown processing** - Custom MD to HTML conversion
- **Real-time editing** - Optimistic updates with background sync

## Architecture Patterns

### Data Flow
- **Offline-first architecture** - Local IndexedDB as primary data store
- **Background synchronization** - Periodic sync with backend API
- **Optimistic updates** - Immediate UI updates with eventual consistency
- **Multi-campaign isolation** - Separate databases per campaign

### State Management
- **React Context** - Global campaign state management
- **Local component state** - UI-specific state with useState/useEffect
- **Dexie live queries** - Reactive database queries with useLiveQuery

### Code Organization
- **Feature-based structure** - Components, hooks, and utilities organized by domain
- **Custom hooks** - Reusable logic for data operations (useNodeOps, useEdgeOps, etc.)
- **Factory patterns** - Campaign-specific database operations
- **Composition over inheritance** - Flexible component architecture

## Key Features

### Campaign Management
- **Multi-campaign support** - Users can own and switch between multiple campaigns
- **Campaign isolation** - Data is segmented by campaign with no cross-contamination
- **Dynamic campaign switching** - Real-time database switching without page reload

### Content Types
- **Notes** - General purpose content nodes
- **Characters** - NPCs and player characters
- **Locations** - Places and settings
- **Sessions** - Game session records
- **Lore** - World-building and background information

### Relationship System
- **Graph-based relationships** - Flexible connections between any content types
- **Relationship types** - DEPICTS, FOLLOWS, FROM, INVOLVES, KNOWS, LIVES_IN, MENTIONS, OCCURS_IN, PART_OF, WITHIN
- **Bidirectional relationships** - Automatic inverse relationship tracking
- **Visual relationship management** - UI for adding/removing connections

### Search & Discovery
- **Full-text search** - Fuzzy search across all content within a campaign
- **Command palette** - Quick access to search, navigation, and actions (Cmd+K)
- **Smart suggestions** - Content-based relationship recommendations
- **Type filtering** - Search within specific content types

### AI Integration
- **Embeddings support** - Content vectorization for semantic search
- **LLM context generation** - Automatic context building for AI interactions
- **Smart suggestions** - AI-powered relationship recommendations

## Development Patterns

### Database Operations
```typescript
// Factory pattern for campaign-specific operations
const nodeOps = createNodeOps(campaignSlug)
const edgeOps = createEdgeOps(campaignSlug)

// Multi-campaign database isolation
const db = getDb(campaignSlug) // Returns campaign-specific DB instance
```

### State Management
```typescript
// Campaign context for global state
const { currentCampaign, switchCampaign } = useCampaign()

// Reactive database queries
const nodes = useLiveQuery(() => db.nodes.toArray(), [])
```

### Data Synchronization
```typescript
// Background sync with optimistic updates
const changes = await db.changes.toArray()
await pushPull(authFetch, campaignSlug)
```

## File Structure
```
src/
├── app/                    # Next.js App Router pages
├── components/             # React components
│   ├── Nav.tsx            # Navigation with campaign selector
│   ├── Sidebar.tsx        # Content tree navigation
│   ├── Inspector.tsx      # Relationship panel
│   └── CommandPalette.tsx # Search and quick actions
├── contexts/              # React context providers
│   └── CampaignContext.tsx # Global campaign state
├── lib/
│   ├── db/               # Database layer
│   ├── hooks/            # Custom React hooks
│   └── search.ts         # Search functionality
├── types/                # TypeScript type definitions
└── utils/               # Utility functions
```

## Environment Setup
- **BACKEND_URL** - FastAPI backend endpoint
- **NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY** - Clerk authentication
- **CLERK_SECRET_KEY** - Server-side Clerk configuration

## Development Commands
- `npm run dev` - Start development server
- `npm run build` - Production build
- `npm run lint` - ESLint checking
- `npm run typecheck` - TypeScript validation

## Key Dependencies
```json
{
  "next": "15.3.5",
  "@clerk/nextjs": "^6.14.5",
  "dexie": "^4.0.8",
  "dexie-react-hooks": "^2.0.0",
  "@tiptap/react": "^2.10.2",
  "lucide-react": "^0.453.0",
  "allotment": "^1.20.2",
  "nanoid": "^5.0.9"
}
```

## Testing Approach
- Manual testing through development server
- Type safety enforced through TypeScript
- Real-time validation via React development tools
- Campaign isolation tested through multi-campaign workflows

## Performance Considerations
- **Lazy loading** - Components and data loaded on demand
- **Database caching** - Persistent IndexedDB for offline access
- **Optimistic updates** - Immediate UI feedback
- **Background sync** - Non-blocking data synchronization
- **Efficient queries** - Indexed database operations with Dexie

## Security Features
- **JWT authentication** - Clerk-managed user sessions
- **Campaign ownership** - Users can only access their own campaigns
- **Data isolation** - No cross-campaign data leakage
- **Server-side validation** - Backend API validates all operations