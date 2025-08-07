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
  - All LLM related calls, work, and features should route through the existing service
  - New features should extend the current infrastructure, not create separate or parallel systems
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

## Debugging Session - Content Contamination Bug Fix

### Problem Description
A critical bug was discovered where editing one note and rapidly switching to another note would cause content contamination - the new note would display or save content from the previously edited note. This occurred when users made edits and quickly navigated between notes before the debounced save completed.

### Root Cause Analysis
The issue was traced to the **TipTap editor's debounced save mechanism**:

1. **Stale Callback Closure**: TipTap uses a 400ms debounced save to batch editor changes
2. **Rapid Node Switching**: When users switched nodes quickly, the old debounced save would still fire
3. **Wrong Target**: The stale debounced save would execute with the old `onContentChange` callback, but the new node was already active
4. **Content Contamination**: This resulted in content from one note being saved to a different note

### Technical Deep Dive
The problematic code was in `components/Tiptap.tsx`:
- `debouncedSave` was memoized with `[onContentChange]` dependency
- When switching nodes rapidly, old debounced saves could fire after the component updated
- The `onContentChange` callback would target the currently active node, not the node that was active when the debounce was created

### Solution Implementation
**Key Fix**: Enhanced content validation in debounced save mechanism

```typescript
// Before: Only checked if component was active
if (isActiveRef.current) {
  onContentChange(htmlToMd(html))
}

// After: Validate content hasn't changed (indicating same node)
const currentContent = content // Captured when debouncer created
if (content === currentContent) {
  onContentChange(htmlToMd(html))
}
```

**Changes Made**:
1. **Content Capture**: Capture the `content` prop when debouncer is created
2. **Dependency Update**: Add `content` to useMemo dependency array to recreate debouncer on node switches  
3. **Validation Check**: Only save if current content matches captured content
4. **Dependency Array**: `[onContentChange, content]` ensures fresh debouncer on node changes

### Secondary Issues Discovered

#### Sync System Deadlock
During debugging, discovered the sync system could get stuck in "syncing" state:
- **Problem**: If a sync operation failed, state remained "syncing" 
- **Result**: All future syncs were blocked indefinitely
- **Fix**: Added timeout mechanism to reset stuck sync states after 10 seconds

#### Performance Issue - Excessive Logging
- **Problem**: useLiveQuery was firing excessively, causing performance degradation
- **Solution**: Added deduplication to content logging to prevent spam

### Key Learnings About the Application

#### Architecture Strengths
1. **Offline-First Design**: IndexedDB with background sync provides excellent user experience
2. **Multi-Campaign Isolation**: Proper database segregation prevents cross-campaign contamination
3. **Reactive Data Flow**: Dexie live queries provide automatic UI updates
4. **Optimistic Updates**: Changes appear immediately while syncing in background

#### Potential Vulnerabilities Identified
1. **Race Conditions**: Rapid UI interactions can create timing-sensitive bugs
2. **Sync State Management**: Complex sync logic can deadlock under error conditions  
3. **Debounced Operations**: Need careful validation to prevent stale operations
4. **Error Recovery**: Systems need robust recovery mechanisms for stuck states

#### Code Quality Observations
1. **Well-Structured**: Clear separation of concerns between hooks, components, and data layers
2. **Type Safety**: Strong TypeScript usage prevents many runtime errors
3. **React Best Practices**: Proper use of hooks, memoization, and cleanup
4. **Extensible Design**: Factory patterns and composition make the codebase maintainable

#### Debugging Methodology Applied
1. **Systematic Approach**: Started with high-level symptoms, narrowed to specific components
2. **Hypothesis-Driven**: Formed and tested specific theories about the root cause
3. **Logging Strategy**: Added targeted logging to trace data flow without performance impact
4. **Minimal Fixes**: Implemented the smallest change that resolved the core issue
5. **Edge Case Consideration**: Added safeguards for related failure modes (sync deadlock)

This debugging session revealed both the robustness of the application's architecture and areas for improvement around race condition handling and error recovery mechanisms.