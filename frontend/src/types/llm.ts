export type LLMMessage = {
  role: string;
  content: string;
  name?: string;
  additional_kwargs?: Record<string, unknown>;
}

export type ChatRequest = {
  user_id: string;
  messages: LLMMessage[];
  metadata: Record<string, unknown>;
  model?: string;
  context?: string
}

export type LLMChatEmbeddedProps = {
  className?: string;
  title?: string;
  placeholder?: string;
  campaign: string;
  activeNodeId: string;
  isOpen?: boolean;
  onToggle?: () => void;
}