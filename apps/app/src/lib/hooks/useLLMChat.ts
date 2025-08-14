import { useState, useRef } from 'react';
import { ChatRequest, LLMMessage } from '@/types/llm';
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
    checkCompactionStatus
  } = useChatHistory(campaign, ownerId, authFetch);

  // Convert chat messages to LLM format
  const messages: LLMMessage[] = chatMessages.map(msg => ({
    role: msg.role,
    content: msg.content
  }));

  // Note: Removed auto-scroll to avoid interrupting user reading experience

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: LLMMessage = { role: 'human', content: input.trim() };
    setInput('');
    setIsLoading(true);

    // Add user message to chat history
    await addMessage('human', userMessage.content);

    try {
      const chatRequest: ChatRequest = {
        user_id: ownerId,
        messages: [...messages, userMessage],
        metadata: {},
        context: contextString,
      };

      const response = await authFetch('/api/llm/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(chatRequest),
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
        accumulated += chunk;
        
        // Update the message in real-time for better UX
        if (placeholderMessageId) {
          await updateMessage(placeholderMessageId, accumulated);
        }
      }
      
      // Final update to ensure message is properly saved
      if (accumulated && placeholderMessageId) {
        await updateMessage(placeholderMessageId, accumulated);
      }
    } catch (err) {
      console.error(err);
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
    // Chat session management
    chatSessions,
    currentChatId,
    onNewChat: handleNewChat,
    onSwitchChat: handleSwitchChat,
    onDeleteChat: handleDeleteChat,
    onCompactChat: handleCompactChat,
    checkCompactionStatus,
  };
}