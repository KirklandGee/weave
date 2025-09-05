export enum ActionType {
  CREATE_NOTE = "create_note",
  UPDATE_NOTE = "update_note", 
  APPEND_TO_NOTE = "append_to_note"
}

export enum NodeType {
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

export interface SuggestedAction {
  type: ActionType;
  target_id: string | null; // null for create, required for update/append
  title: string;            // For create/update operations
  content: string;          // The actual content to create/add
  node_type: NodeType;      // The type of node to create/modify
  reasoning: string;        // Why the agent suggests this action
}

export interface AgentStreamEvent {
  type: 'text' | 'tool_call' | 'tool_result' | 'suggested_actions' | 'error';
}

export interface TextEvent extends AgentStreamEvent {
  type: 'text';
  content: string;
}

export interface ToolCallEvent extends AgentStreamEvent {
  type: 'tool_call';
  content: string;
}

export interface ToolResultEvent extends AgentStreamEvent {
  type: 'tool_result';
  content: string;
}

export interface SuggestedActionsEvent extends AgentStreamEvent {
  type: 'suggested_actions';
  content: SuggestedAction[];
}

export interface ErrorEvent extends AgentStreamEvent {
  type: 'error';
  content: string;
}

export type ParsedStreamEvent = TextEvent | ToolCallEvent | ToolResultEvent | SuggestedActionsEvent | ErrorEvent;

export interface AgentChatRequest {
  messages: Array<{
    role: string;
    content: string;
  }>;
  context: string;
  campaign_id: string; // Required for agent context
}

export interface ActionPreviewState {
  action: SuggestedAction;
  originalContent?: string;
  originalTitle?: string;
  isPreviewActive: boolean;
  targetNodeId: string;
}