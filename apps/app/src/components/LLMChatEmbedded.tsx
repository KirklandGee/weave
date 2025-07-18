import React, { useState, useRef, useEffect } from 'react';
import { ChatRequest, LLMMessage, LLMChatEmbeddedProps } from '@/types/llm';
import { Rnd } from 'react-rnd';
import { useLLMContext } from '@/lib/hooks/useLLMContext';
import { useAuthFetch } from '@/utils/authFetch.client';
import { Trash2, X } from 'lucide-react';

export default function LLMChatEmbedded({
  title = 'AI Assistant',
  placeholder = 'Ask me anything...',
  campaign,
  activeNodeId,
  isOpen = false,
  onToggle
}: LLMChatEmbeddedProps) {

  const contextString = useLLMContext(campaign, activeNodeId)
  const [messages, setMessages] = useState<LLMMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // state for position & size
  const [panelPos, setPanelPos] = useState({ x: 100, y: 100 });
  const [panelSize, setPanelSize] = useState({ width: 400, height: 500 });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const authFetch = useAuthFetch();

  // initialize position at bottom-right on first open
  useEffect(() => {
    if (!isOpen) return;
    const margin = 16;
    // Get parent container dimensions instead of window
    const parentEl = document.querySelector('main');
    if (parentEl) {
      const parentRect = parentEl.getBoundingClientRect();
      const x = parentRect.width - panelSize.width - margin;
      const y = parentRect.height - panelSize.height - margin - 60; // space for toggle button area
      setPanelPos({ x, y });
    }
  }, [isOpen, panelSize.width, panelSize.height]);

  // scroll to bottom on new messages
  useEffect(() => {
    if (isOpen) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: LLMMessage = { role: 'human', content: input.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      console.log('contextString:', contextString); // Add this line
      console.log('typeof contextString:', typeof contextString);

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

  return (
    <>
      {/* Chat Panel */}
      {isOpen && (
        <Rnd
          size={{ width: panelSize.width, height: panelSize.height }}
          position={{ x: panelPos.x, y: panelPos.y }}
          bounds="parent"
          onDragStop={(_, d) => setPanelPos({ x: d.x, y: d.y })}
          onResizeStop={(_e, _dir, ref, _delta, pos) => {
            setPanelSize({ width: ref.offsetWidth, height: ref.offsetHeight });
            setPanelPos(pos);
          }}
          dragHandleClassName="chat-drag-handle"
          className="bg-zinc-900 text-zinc-200 rounded-lg shadow-2xl border border-zinc-800 overflow-hidden z-50 absolute"
        >
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="chat-drag-handle flex items-center justify-between p-3 border-b border-zinc-800 bg-zinc-900 cursor-move flex-shrink-0">
              <h4 className="text-sm font-medium text-zinc-400 uppercase tracking-wide">{title}</h4>
              <div className="flex items-center gap-2">
                <button 
                  onClick={clearChat}
                  className="flex items-center justify-center w-7 h-7 text-zinc-400 hover:text-red-400 hover:bg-red-900/20 rounded-md transition-colors"
                  title="Clear Chat History"
                >
                  <Trash2 size={14} />
                </button>
                <button 
                  onClick={onToggle}
                  className="flex items-center justify-center w-7 h-7 text-zinc-400 hover:text-zinc-200 rounded-md transition-colors"
                  title="Close AI Assistant"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div
              className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 bg-zinc-950"
              onWheel={(e) => {
                e.stopPropagation();
              }}
            >
              {messages.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-zinc-500 text-base">Ask me anything about your campaign!</p>
                </div>
              )}
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'human' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] p-4 rounded-lg text-base leading-relaxed whitespace-pre-wrap ${
                      msg.role === 'human' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-zinc-800 text-zinc-100 border border-zinc-700'
                    }`}
                  >
                    {msg.content}
                    {msg.role === 'ai' && idx === messages.length - 1 && isLoading && (
                      <span className="inline-block w-2 h-5 bg-zinc-400 animate-pulse ml-1">▋</span>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-zinc-800 p-3 bg-zinc-900 flex-shrink-0">
              <form onSubmit={handleSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder={placeholder}
                  disabled={isLoading}
                  className="flex-1 px-3 py-2 text-sm bg-zinc-800 text-zinc-100 border border-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 placeholder-zinc-500"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 disabled:text-zinc-500 rounded-md disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-zinc-300 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    'Send'
                  )}
                </button>
              </form>
            </div>
          </div>
        </Rnd>
      )}
    </>
  );
}