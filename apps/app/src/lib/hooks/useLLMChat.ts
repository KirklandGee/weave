import { useState, useRef } from 'react';
import { ChatRequest, LLMMessage } from '@/types/llm';
import { useLLMContext } from '@/lib/hooks/useLLMContext';
import { useTemplateContext } from '@/lib/hooks/useTemplateContext';
import { useAuthFetch } from '@/utils/authFetch.client';

export function useLLMChat(campaign: string, activeNodeId: string) {
  const contextString = useLLMContext(campaign, activeNodeId);
  const templateContextString = useTemplateContext(campaign, activeNodeId);
  const authFetch = useAuthFetch();
  
  const [messages, setMessages] = useState<LLMMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Note: Removed auto-scroll to avoid interrupting user reading experience

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: LLMMessage = { role: 'human', content: input.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const chatRequest: ChatRequest = {
        user_id: 'demo-user',
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
      setMessages(prev => [...prev, { role: 'ai', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = new TextDecoder().decode(value);
        accumulated += chunk;
        setMessages(prev => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: 'ai', content: accumulated };
          return copy;
        });
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'ai', content: 'Error processing request, please try again.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => setMessages([]);

  return {
    messages,
    input,
    setInput,
    isLoading,
    messagesEndRef,
    contextString,
    templateContextString,
    handleSubmit,
    clearChat,
  };
}