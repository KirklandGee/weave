# Pre-Launch Development Plan

## Phase 1: Authentication & User Management

### Implementation Steps
1. **Set up Clerk in Next.js**
   - Install Clerk SDK and configure providers
   - Create login/signup pages
   - Add Clerk middleware to protect routes

2. **JWT Storage in IndexedDB**
   - Extend Dexie schema to store JWT tokens
   - Handle token refresh logic
   - Implement offline session persistence

3. **FastAPI JWT Verification**
   - Add JWT verification middleware
   - Extract user_id from validated tokens
   - Update all API endpoints to use authenticated user_id

4. **Neo4j Security Updates**
   - Add constraint: `CREATE CONSTRAINT user_nodes FOR (n:MarkdownNode) REQUIRE n.owner_id IS NOT NULL`
   - Update all Cypher queries to filter by authenticated user_id
   - Migrate from "demo-user" to real user IDs

### Questions to Answer
- **JWT expiration time**: How long should tokens last before refresh?
- **Session handling**: Automatic refresh or redirect to login on expiry?
- **Error handling**: How to handle JWT verification failures gracefully?

### Potential Gotchas
- **Sync timing**: JWT refresh while offline sync is happening
- **Migration path**: Ensure clean transition from demo-user to real users
- **CORS issues**: JWT headers between Next.js and FastAPI

## Phase 2: Onboarding Wizard

### Implementation Steps
1. **Wizard Component Structure**
   - Create multi-step wizard component in Next.js
   - Implement step navigation (next/back/skip)
   - Add progress indicator

2. **Dexie Schema Extension**
   ```javascript
   wizardState: {
     id: 'string', // user_id + timestamp or 'onboarding'
     step: 'number',
     data: 'object',
     created_at: 'date',
     completed: 'boolean'
   }
   ```

3. **Wizard Steps Design**
   - **Step 1**: Campaign Basics (name, genre, system, description)
   - **Step 2**: World & Setting (location, conflict, key places)
   - **Step 3**: Characters & NPCs (player count, NPCs, starting situation)
   - **Step 4**: Campaign Style (focus, themes)
   - **Step 5**: Generate & Review (preview, final confirmation)

4. **Background Job Implementation**
   - Set up task queue (Celery/RQ)
   - Create Langchain prompt templates for D&D 5e
   - Build note generation service
   - Add progress tracking for user

5. **Integration Points**
   - Trigger wizard after Clerk signup (onboarding)
   - Add "Create Campaign" button for new campaigns
   - Handle wizard state persistence and cleanup

### Questions to Answer
- **Template variety**: How many different note templates per campaign type?
- **Generation time**: How long should users wait? Need progress indicators?
- **Failure handling**: What if LLM generation fails partway through?
- **Cost control**: How many tokens per wizard completion?

### Potential Gotchas
- **State consistency**: Wizard state vs. actual generated notes
- **Background job reliability**: What if job fails or times out?
- **Template quality**: Ensuring generated content is actually useful
- **User expectations**: Managing what the wizard can/cannot do

## Phase 3: LLM Cost Tracking & Tracing

### Implementation Steps
1. **Cost Tracking Schema**
   ```python
   # Add to database
   llm_usage = {
     user_id: str,
     request_id: str,
     timestamp: datetime,
     model: str,
     prompt_tokens: int,
     completion_tokens: int,
     total_tokens: int,
     cost_cents: int,
     feature: str  # 'wizard', 'chat', 'editing', etc.
   }
   ```

2. **Tracing Decorator Enhancement**
   - Extend existing decorator to capture cost data
   - Add user_id extraction from JWT
   - Implement token counting for different models

3. **Cost Calculation Service**
   - Create pricing lookup for OpenAI/HuggingFace models
   - Build rollup calculations (daily/monthly per user)
   - Add cost alerting for high usage

4. **Usage Dashboard**
   - Admin view for cost monitoring
   - User view for their usage (if needed)
   - Export capabilities for billing

### Questions to Answer
- **Model selection**: OpenAI vs. HuggingFace for cost optimization?
- **Rollup frequency**: Real-time vs. batch processing?
- **Cost alerts**: At what thresholds should you get notified?
- **User limits**: How to handle users hitting usage caps?

### Potential Gotchas
- **Token counting accuracy**: Different models count differently
- **Cost calculation drift**: Pricing changes from providers
- **High usage scenarios**: Preventing runaway costs
- **Data retention**: How long to keep detailed usage logs?

## Phase 4: UI Bug Fixes (Tiptap Sync Issues)

### Implementation Steps
1. **Diagnosis Phase**
   - Identify specific cursor jumping scenarios
   - Test markdown ↔ HTML conversion edge cases
   - Profile sync performance with real user data

2. **Solution Options**
   - **Option A**: Fix markdown conversion to preserve cursor position
   - **Option B**: Switch to Tiptap native JSON storage in Neo4j
   - **Option C**: Implement operational transforms (Y.js)

3. **Implementation**
   - Choose solution based on complexity vs. benefit
   - Update sync layer to handle new format
   - Add conflict resolution for concurrent edits

### Questions to Answer
- **Format migration**: How to convert existing markdown nodes?
- **Sync complexity**: Can current Dexie layer handle richer data?
- **Performance impact**: Will JSON storage affect Neo4j performance?

### Potential Gotchas
- **Data migration**: Converting existing user data safely
- **Sync conflicts**: More complex with rich text formats
- **Browser compatibility**: Ensuring IndexedDB handles larger objects

## Phase 5: Infrastructure & Deployment

### Implementation Steps
1. **Task Queue Setup**
   - Choose between Celery/RQ for background jobs
   - Set up Redis for task queuing
   - Implement job monitoring and failure handling

2. **Database Deployment**
   - Decide: Self-hosted Neo4j vs. cloud (AuraDB)
   - Set up backup and disaster recovery
   - Configure connection pooling and monitoring

3. **Application Deployment**
   - Containerize Next.js and FastAPI applications
   - Choose hosting platform (AWS, Google Cloud, etc.)
   - Set up CI/CD pipeline

4. **Monitoring Setup**
   - Application monitoring (errors, performance)
   - Database monitoring (queries, connections)
   - Cost monitoring (LLM usage, infrastructure)

### Questions to Answer
- **Hosting platform**: Which cloud provider for cost vs. features?
- **Scaling strategy**: How to handle growth in users/usage?
- **Backup frequency**: How often to backup user data?
- **Monitoring tools**: What level of observability do you need?

### Potential Gotchas
- **Neo4j licensing**: Ensure compliance with chosen deployment
- **Container orchestration**: Kubernetes complexity vs. simpler options
- **Secret management**: Secure handling of API keys and tokens
- **SSL/TLS**: Proper certificate management

## Phase 6: Payments & Billing

### Implementation Steps
1. **Payment Integration**
   - Set up Stripe account and webhooks
   - Implement subscription creation/management
   - Add payment method collection

2. **Billing Logic**
   - Define pricing tiers (free tier + AI features)
   - Implement usage-based billing for LLM features
   - Create billing cycle management

3. **Admin Dashboard**
   - User management interface
   - Subscription status monitoring
   - Usage analytics and reporting

### Questions to Answer
- **Pricing model**: Free tier limits? AI feature pricing?
- **Billing frequency**: Monthly? Usage-based? Hybrid?
- **Payment failures**: How to handle failed payments?
- **Refund policy**: What scenarios require refunds?

### Potential Gotchas
- **Webhook reliability**: Ensuring Stripe events are processed
- **Proration handling**: Mid-cycle subscription changes
- **Tax compliance**: Sales tax for different jurisdictions
- **Dunning management**: Handling failed payment recovery

## Phase 7: Marketing Site

### Implementation Steps
1. **Landing Page**
   - Create compelling product description
   - Add demo videos/screenshots
   - Implement lead capture

2. **Documentation**
   - User guides and tutorials
   - API documentation (if applicable)
   - FAQ section

3. **SEO Optimization**
   - Keyword research for D&D/RPG tools
   - Content marketing strategy
   - Technical SEO implementation

### Questions to Answer
- **Target audience**: Specific D&D demographics vs. broader RPG market?
- **Value proposition**: What makes your tool unique?
- **Content strategy**: Blog posts, tutorials, example campaigns?

## Risk Assessment & Contingencies

### High-Risk Areas
1. **Auth complexity**: JWT + offline sync interaction
2. **LLM costs**: Preventing runaway expenses
3. **Data migration**: Moving from demo to real users
4. **Sync conflicts**: Complex with rich text editing

### Mitigation Strategies
- **Staged rollouts**: Test with limited user groups
- **Cost monitoring**: Real-time alerts and limits
- **Backup plans**: Fallback options for each major component
- **User communication**: Clear expectations about features and limitations

## Success Metrics

### Technical Metrics
- **Authentication**: Login success rate, session duration
- **Wizard completion**: Conversion rate, time to complete
- **LLM costs**: Cost per user, usage patterns
- **Sync reliability**: Conflict resolution success rate

### Business Metrics
- **User acquisition**: Signup rate, activation rate
- **Engagement**: Daily/weekly active users, feature usage
- **Revenue**: Subscription conversion, usage-based revenue
- **Support**: Ticket volume, resolution time

## Timeline Estimate

- **Phase 1** (Auth): 2-3 weeks
- **Phase 2** (Wizard): 3-4 weeks
- **Phase 3** (Cost Tracking): 1-2 weeks
- **Phase 4** (UI Fixes): 2-3 weeks
- **Phase 5** (Infrastructure): 2-3 weeks
- **Phase 6** (Payments): 3-4 weeks
- **Phase 7** (Marketing): 2-3 weeks

**Total: 15-22 weeks (3.5-5 months)**

*Note: Phases 1-3 are sequential, but phases 4-7 can be partially parallelized depending on your capacity.*