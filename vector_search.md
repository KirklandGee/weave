# Vector Search Frontend Implementation Plan

## Overview

Implement semantic search and AI-powered relationship discovery in the frontend while maintaining the existing offline-first Dexie sync architecture. The system will gracefully degrade to fuzzy text search when vector embeddings are unavailable.

## Architecture Decision

**Hybrid Approach**: Keep the sync layer clean by not syncing large embedding vectors, but add minimal metadata for embedding status tracking. Use API calls for vector operations with intelligent fallbacks.

---

## 1. Database Schema Updates

### 1.1 Extend Dexie Schema

Update `Note` interface to include embedding metadata:

```typescript
export interface Note {
  // ... existing fields
  hasEmbedding?: boolean      // Quick check for UI indicators
  embeddedAt?: number         // Timestamp when embedded (epoch ms)
  contentHash?: string        // MD5 hash for change detection
}
```

### 1.2 Dexie Version Migration

Add version 5 to `campaignDB.ts`:
```javascript
this.version(5).stores({
  nodes: 'id, ownerId, campaignId, type, updatedAt, hasEmbedding, [ownerId+campaignId]',
  // ... other tables unchanged
})
```

### 1.3 Sync Layer Updates

- Modify `sync.ts` to handle new embedding metadata fields
- Ensure `pushPull()` syncs embedding status without the actual vectors

---

## 2. Search Infrastructure

### 2.1 Search Service Architecture

Create `src/lib/services/searchService.ts`:

```typescript
interface SearchResult {
  node: Note
  score: number
  matchType: 'vector' | 'fuzzy' | 'exact'
}

class SearchService {
  async search(query: string): Promise<SearchResult[]>
  async findSimilar(nodeId: string): Promise<SearchResult[]>
  async suggestRelationships(): Promise<RelationshipSuggestion[]>
}
```

### 2.2 Fallback Strategy

**Search Priority Order:**
1. **Vector Search** (if embeddings available + online)
2. **Fuzzy Text Search** (using Fuse.js or similar)
3. **Simple Text Match** (fallback for offline)

### 2.3 Fuzzy Search Implementation

Use `fuse.js` for client-side fuzzy search:
- Index: `title`, `markdown` content
- Configurable thresholds
- Weights: title > markdown content
- Support for partial matches

---

## 3. UI Components

### 3.1 Search Interface

**Component: `SearchPanel.tsx`**
- Real-time search with debouncing (300ms)
- Visual indicators for search type (🤖 vector, 🔍 fuzzy, 📝 text)
- Loading states and error handling
- Results grouping by relevance/type

**Component: `SearchResult.tsx`**
- Display similarity scores
- Highlight matching text
- Show search method used
- Quick action buttons (open, link, etc.)

### 3.2 Relationship Discovery

**Component: `RelationshipSuggestions.tsx`**
- Triggered manually or on node save
- Shows suggested connections with confidence scores
- One-click relationship creation
- Dismissible suggestions with "don't show again"

**Component: `EmbeddingStatus.tsx`**
- Shows embedding coverage for campaign
- Trigger for bulk embedding generation
- Status indicators (embedded, pending, failed)

---

## 4. State Management

### 4.1 Search State

```typescript
interface SearchState {
  query: string
  results: SearchResult[]
  isLoading: boolean
  searchType: 'vector' | 'fuzzy' | 'text'
  error?: string
}
```

### 4.2 Embedding State

```typescript
interface EmbeddingState {
  campaignStatus: {
    totalNodes: number
    embeddedNodes: number
    coverage: number
  }
  isEmbedding: boolean
  lastEmbeddingCheck: number
}
```

---

## 5. API Integration

### 5.1 Search API Calls

**Endpoints to integrate:**
- `POST /search/` - Vector search
- `GET /search/similar/{nodeId}` - Find similar content
- `GET /search/suggest-relationships/{campaignId}` - Relationship suggestions
- `GET /embed/status/{campaignId}` - Embedding status

### 5.2 Error Handling & Retries

**Network Error Strategy:**
- Automatic fallback to local search on API failure
- Retry with exponential backoff for transient errors
- Cache successful API responses locally (5-minute TTL)
- Show clear error states to users

### 5.3 Request Optimization

- Debounce search queries (300ms)
- Cancel in-flight requests on new queries
- Batch relationship suggestions
- Implement request deduplication

---

## 6. Performance Considerations

### 6.1 Local Search Optimization

- **Fuzzy Search Index**: Pre-build Fuse.js index on campaign load
- **Incremental Updates**: Update search index on node changes
- **Memory Management**: Limit search result count (default: 50)
- **Background Processing**: Build search indexes in Web Workers if needed

### 6.2 Caching Strategy

```typescript
interface SearchCache {
  vectorResults: Map<string, CachedResult>  // TTL: 5 minutes
  relationshipSuggestions: CachedSuggestions // TTL: 30 minutes
  embeddingStatus: EmbeddingStatus          // TTL: 10 minutes
}
```

### 6.3 Progressive Enhancement

- Load search functionality after core app
- Lazy load fuzzy search library
- Background prefetch of embedding status

---

## 7. Failure Scenarios & Mitigations

### 7.1 Network Failures

**Problem**: API unavailable during search
**Mitigation**: 
- Automatic fallback to local fuzzy search
- Clear UI indication of degraded functionality
- Queue failed requests for retry when online

### 7.2 Embedding Generation Failures

**Problem**: Backend fails to generate embeddings
**Mitigation**:
- Track failed embedding attempts in metadata
- Retry failed embeddings with exponential backoff
- Provide manual "re-embed" functionality
- Fall back to text search for failed nodes

### 7.3 Large Dataset Performance

**Problem**: Fuzzy search becomes slow with >1000 nodes
**Mitigation**:
- Implement search result pagination
- Limit searchable text length per node
- Use Web Workers for heavy search operations
- Progressive search (show exact matches first, then fuzzy)

### 7.4 Inconsistent Data States

**Problem**: Embedding metadata out of sync with actual embeddings
**Mitigation**:
- Periodic background sync verification
- "Refresh embeddings" button in settings
- Server-side cleanup scripts
- Local cache invalidation on conflicts

### 7.5 Browser Compatibility

**Problem**: Older browsers don't support required APIs
**Mitigation**:
- Polyfills for essential features
- Graceful degradation to basic text search
- Feature detection before using advanced APIs

---

## 8. Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] Update Dexie schema and sync layer
- [ ] Implement basic fuzzy search with Fuse.js
- [ ] Create search UI components
- [ ] Add embedding status tracking

### Phase 2: API Integration (Week 2)
- [ ] Integrate vector search API endpoints
- [ ] Implement fallback logic
- [ ] Add error handling and retry mechanisms
- [ ] Create relationship suggestion UI

### Phase 3: Polish & Optimization (Week 3)
- [ ] Performance optimization
- [ ] Comprehensive error handling
- [ ] UI/UX improvements
- [ ] Testing and edge case handling

### Phase 4: Advanced Features (Week 4)
- [ ] Search result caching
- [ ] Background embedding status checks
- [ ] Advanced relationship suggestion filtering
- [ ] Analytics and usage tracking

---

## 9. Testing Strategy

### 9.1 Unit Tests
- Search service functionality
- Fallback logic correctness
- Cache behavior
- API error handling

### 9.2 Integration Tests
- End-to-end search workflows
- Sync layer with new fields
- Network failure scenarios
- Large dataset performance

### 9.3 User Acceptance Tests
- Search relevance quality
- UI responsiveness
- Offline functionality
- Error state clarity

---

## 10. Monitoring & Metrics

### 10.1 Frontend Metrics
- Search query performance (local vs API)
- Fallback usage frequency
- User interaction with suggestions
- Error rates by search type

### 10.2 User Experience Metrics
- Time to first search result
- Search abandonment rate
- Relationship suggestion acceptance rate
- Feature usage patterns

---

## 11. Future Enhancements

### 11.1 Advanced Search Features
- Filters by node type, date, tags
- Saved searches and search history
- Full-text search with highlighting
- Search within specific relationships

### 11.2 AI Improvements
- Custom embedding fine-tuning for D&D content
- Relationship type classification
- Automatic tagging suggestions
- Content summarization

### 11.3 Performance Optimizations
- Client-side vector search (when WebGPU mature)
- Incremental embedding updates
- Predictive relationship caching
- Advanced search result ranking

---

## Risk Assessment

**High Risk:**
- Network dependency for core feature functionality
- Embedding generation failures affecting search quality
- Performance degradation with large campaigns

**Medium Risk:**
- UI complexity with multiple search modes
- Cache invalidation edge cases
- Browser compatibility issues

**Low Risk:**
- Fuzzy search accuracy
- Minor sync conflicts
- Feature discoverability

---

## Success Criteria

1. **Functional**: Search works reliably online and offline
2. **Performance**: <500ms response time for local search, <2s for API search
3. **Quality**: Vector search provides measurably better results than fuzzy search
4. **Resilience**: Graceful degradation in all failure scenarios
5. **Usability**: Users can discover and use search features intuitively