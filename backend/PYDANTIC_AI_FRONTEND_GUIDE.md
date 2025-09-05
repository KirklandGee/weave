# PydanticAI Agent Integration - Frontend Developer Guide

## Overview
The backend now has a PydanticAI agent endpoint at `/agents/chat/stream` that provides structured responses with both chat messages and suggested database actions. This guide covers how the frontend should integrate with this new system.

## Endpoint Details

### URL
`POST /agents/chat/stream`

### Request Format
```typescript
interface ChatRequest {
  messages: LLMMessage[];
  context: string;
  campaign_id: string; // Required for agent context
}
```

### Response Format
The endpoint streams JSON objects with different event types:

```typescript
// Chat response from agent
{
  "type": "content",
  "content": "I found some relevant notes about dragons in your campaign..."
}

// Tool execution events (informational)
{
  "type": "tool_event", 
  "tool_name": "search_campaign_nodes",
  "args": {"query": "dragon", "node_types": ["note"]},
  "result": [{"id": "note_123", "title": "Red Dragon Stats", "content": "..."}]
}

// Structured actions for frontend to handle
{
  "type": "actions",
  "actions": [
    {
      "type": "create_note",
      "target_id": null,
      "title": "New Dragon Encounter",
      "content": "# Dragon Encounter\n\nBased on your existing notes...",
      "node_type": "Note",
      "reasoning": "Creating a new encounter note based on your campaign's dragon lore"
    }
  ]
}
```

## Action Types and Structure

### Action Enum Types
```typescript
enum ActionType {
  CREATE_NOTE = "create_note",
  UPDATE_NOTE = "update_note", 
  APPEND_TO_NOTE = "append_to_note"
}

enum NodeType {
  NOTE = "Note",
  CHARACTER = "Character",
  LOCATION = "Location",
  QUEST = "Quest",
  EVENT = "Event",
  SESSION = "Session",
  NPC = "NPC",
  ITEM = "Item",
  LORE = "Lore",
  RULE = "Rule"
}
```

### Action Model
```typescript
interface Action {
  type: ActionType;
  target_id: string | null; // null for create, required for update/append
  title: string;            // For create/update operations
  content: string;          // The actual content to create/add
  node_type: NodeType;      // Must be one of the valid NodeType enum values
  reasoning: string;        // Why the agent suggests this action
}
```

## Frontend Integration Patterns

### 1. Stream Processing
```typescript
async function processAgentStream(response: Response) {
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    const chunk = decoder.decode(value);
    const lines = chunk.split('\n').filter(line => line.trim());
    
    for (const line of lines) {
      try {
        const event = JSON.parse(line);
        handleStreamEvent(event);
      } catch (e) {
        console.warn('Failed to parse stream event:', line);
      }
    }
  }
}
```

### 2. Event Handling
```typescript
function handleStreamEvent(event: any) {
  switch (event.type) {
    case 'content':
      // Display chat message to user
      appendToChatUI(event.content);
      break;
      
    case 'tool_event':
      // Optional: Show tool execution in debug UI
      console.log(`Tool: ${event.tool_name}`, event.args, event.result);
      break;
      
    case 'actions':
      // Present suggested actions to user
      displaySuggestedActions(event.actions);
      break;
  }
}
```

### 3. Action Handling UI
```typescript
function displaySuggestedActions(actions: Action[]) {
  // Show actions as clickable cards/buttons
  actions.forEach(action => {
    const actionCard = createActionCard({
      title: `${action.type.replace('_', ' ')} - ${action.title}`,
      description: action.reasoning,
      onClick: () => executeAction(action)
    });
    
    suggestedActionsContainer.appendChild(actionCard);
  });
}

async function executeAction(action: Action) {
  switch (action.type) {
    case 'create_note':
      await createNote({
        title: action.title,
        content: action.content,
        type: action.node_type // NodeType enum value
      });
      break;
      
    case 'update_note':
      await updateNode(action.target_id, {
        title: action.title,
        content: action.content
      });
      break;
      
    case 'append_to_note':
      const existing = await getNode(action.target_id);
      await updateNode(action.target_id, {
        content: existing.content + '\n\n' + action.content
      });
      break;
  }
}
```

## Key Integration Points

### Campaign Context
- Always include `campaign_id` in requests
- Agent has access to Neo4j search tools for the specified campaign
- Actions will be contextualized to the active campaign

### Message History 
- Send full conversation history in `messages` array
- Include any campaign context in the `context` field
- Agent maintains conversation state across requests

### Tool Events vs Actions
- **Tool Events**: Informational only, show what data the agent found
- **Actions**: Actual suggestions that require user approval/execution
- Never auto-execute actions - always present to user for confirmation

### Error Handling
```typescript
// Handle stream parsing errors gracefully
try {
  const event = JSON.parse(line);
  handleStreamEvent(event);
} catch (e) {
  // Log but don't crash - partial JSON is common in streaming
  console.warn('Stream parse error:', e);
}

// Handle action execution errors
async function executeAction(action: Action) {
  try {
    await performAction(action);
    showSuccessMessage(`${action.type} completed`);
  } catch (error) {
    showErrorMessage(`Failed to ${action.type}: ${error.message}`);
  }
}
```

## Agent Behavior

### When Agents Provide Actions
- User request is clear and specific
- Agent has enough context to create useful content
- No additional clarification needed

### When Agents Ask Questions (No Actions)
- User request is ambiguous or could go multiple directions
- Agent needs preferences, details, or clarification
- When asking questions, `actions` array will be empty `[]`

### Example Interaction Flow
```
User: "Add a new dragon to my campaign"
Agent: "I can help create a dragon for your campaign. What type of dragon would you like? Here are some options based on your existing lore..."
Actions: [] // Empty - asking for clarification

User: "A red dragon, make it an ancient one"  
Agent: "I'll create an ancient red dragon based on your campaign's dragon lore..."
Actions: [{ type: "create_note", title: "Ancient Red Dragon", ... }]
```

## Testing and Development

### Test Endpoint
Use the test script at `/backend/tests/test_agent_endpoint.py` to see full response structure:

```bash
cd backend
python -m pytest tests/test_agent_endpoint.py -v -s
```

### Debug Output
Set up debug logging to see tool events and understand agent decision-making:

```typescript
console.log('Tool executed:', event.tool_name, event.result);
console.log('Actions suggested:', event.actions);
```

## Migration Notes

### From Existing LLM Service
- Old endpoint: `/llm/chat/stream` 
- New endpoint: `/agents/chat/stream`
- New: Structured actions instead of just text responses
- New: Tool event visibility for debugging
- Same: Streaming format, authentication, usage tracking

### Required Frontend Changes
1. Update endpoint URL
2. Add `campaign_id` to requests
3. Handle new streaming event types
4. Build UI for suggested actions
5. Implement action execution logic