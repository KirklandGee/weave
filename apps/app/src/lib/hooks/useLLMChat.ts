import { useState, useRef } from 'react';
import { ChatRequest, LLMMessage } from '@/types/llm';
import { AgentChatRequest, ParsedStreamEvent, SuggestedAction, ActionType } from '@/types/agent';
import { useLLMContext } from '@/lib/hooks/useLLMContext';
import { useTemplateContext } from '@/lib/hooks/useTemplateContext';
import { useAuthFetch } from '@/utils/authFetch.client';
import { useChatHistory } from '@/lib/hooks/useChatHistory';

export function useLLMChat(campaign: string, activeNodeId: string, ownerId: string = 'demo-user') {
  const contextString = useLLMContext(campaign, activeNodeId);
  const templateContextString = useTemplateContext(campaign, activeNodeId);
  const authFetch = useAuthFetch();
  
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [toolCalls, setToolCalls] = useState<Array<{ type: string; content: string }>>([]);
  const [suggestedActions, setSuggestedActions] = useState<SuggestedAction[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Use chat history hook for persistent storage
  const {
    chatSessions,
    currentChatId, 
    messages: chatMessages,
    isLoading: chatLoading,
    isCompacting,
    createNewChat,
    addMessage,
    updateMessage,
    switchToChat,
    deleteChat,
    clearCurrentChat,
    compactCurrentChat,
    checkCompactionStatus,
    renameChat
  } = useChatHistory(campaign, ownerId, authFetch);

  // Convert chat messages to LLM format
  const messages: LLMMessage[] = chatMessages.map(msg => ({
    role: msg.role,
    content: msg.content
  }));

  // Note: Removed auto-scroll to avoid interrupting user reading experience

  const parseStreamEvent = (line: string): ParsedStreamEvent | null => {
    if (!line.trim()) return null;
    try {
      const parsed = JSON.parse(line.trim());
      // Validate it has the expected shape
      if (typeof parsed === 'object' && parsed !== null && 'type' in parsed) {
        return parsed as ParsedStreamEvent;
      }
      return null;
    } catch (e) {
      // Skip malformed JSON silently - common with streaming
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: LLMMessage = { role: 'human', content: input.trim() };
    setInput('');
    setIsLoading(true);
    
    // Clear previous tool calls and actions
    setToolCalls([]);
    setSuggestedActions([]);

    // Add user message to chat history
    await addMessage('human', userMessage.content);

    try {
      const agentRequest = {
        user_id: ownerId,
        messages: [...messages, userMessage],
        context: contextString,
        campaign_id: campaign,
        metadata: {},
      };

      const response = await authFetch('/api/agents/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(agentRequest),
      });
      
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      let accumulated = '';
      // Add placeholder AI message that will be updated
      const placeholderMessageId = await addMessage('ai', '');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          const event = parseStreamEvent(line);
          if (!event) continue;

          switch (event.type) {
            case 'text':
              // Backend sends complete text each time, not incremental chunks
              // So we use the event content directly instead of accumulating
              if (placeholderMessageId) {
                await updateMessage(placeholderMessageId, event.content);
              }
              accumulated = event.content; // Keep for final save
              break;
              
            case 'tool_call':
              // Add tool call to state (don't create separate messages)
              setToolCalls(prev => [...prev, { type: 'tool_call', content: event.content }]);
              break;
              
            case 'tool_result':
              // Add tool result to state (don't create separate messages)
              setToolCalls(prev => [...prev, { type: 'tool_result', content: event.content }]);
              break;
              
            case 'suggested_actions':
              setSuggestedActions(event.content);
              break;
              
            case 'error':
              console.error('Agent error:', event.content);
              accumulated += `\n\n**Error:** ${event.content}`;
              if (placeholderMessageId) {
                await updateMessage(placeholderMessageId, accumulated);
              }
              break;
          }
        }
      }
      
      // Final update to ensure message is properly saved
      if (accumulated && placeholderMessageId) {
        await updateMessage(placeholderMessageId, accumulated);
      }
    } catch (error) {
      console.error('Chat error:', error);
      await addMessage('ai', 'Error processing request, please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = async () => {
    await createNewChat(undefined, activeNodeId);
  };

  const handleSwitchChat = (chatId: string) => {
    switchToChat(chatId);
  };

  const handleDeleteChat = async (chatId: string) => {
    await deleteChat(chatId);
  };

  const handleClearChat = async () => {
    await clearCurrentChat();
  };

  const handleCompactChat = async () => {
    if (!currentChatId) return null;
    return await compactCurrentChat();
  };

  const clearSuggestedActions = () => {
    setSuggestedActions([]);
  };

  return {
    messages,
    input,
    setInput,
    isLoading: isLoading || chatLoading,
    isCompacting,
    messagesEndRef,
    contextString,
    templateContextString,
    handleSubmit,
    clearChat: handleClearChat,
    // Agent-specific state
    toolCalls,
    suggestedActions,
    // Chat session management
    chatSessions,
    currentChatId,
    onNewChat: handleNewChat,
    onSwitchChat: handleSwitchChat,
    onDeleteChat: handleDeleteChat,
    onCompactChat: handleCompactChat,
    checkCompactionStatus,
    onRenameChat: renameChat,
    clearSuggestedActions,
  };
}