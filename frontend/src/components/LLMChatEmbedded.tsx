import React, { useState, useRef, useEffect } from 'react';
import { ChatRequest, LLMMessage, LLMChatEmbeddedProps } from '@/types/llm';
import { Rnd } from 'react-rnd';

export default function LLMChatEmbedded({
  title = 'AI Assistant',
  placeholder = 'Ask me anything...'
}: LLMChatEmbeddedProps) {
  const [messages, setMessages] = useState<LLMMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // state for position & size
  const [panelPos, setPanelPos] = useState({ x: 100, y: 100 });
  const [panelSize, setPanelSize] = useState({ width: 320, height: 360 });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  

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
      const chatRequest: ChatRequest = {
        user_id: 'default-user',
        messages: [...messages, userMessage],
        metadata: {},
      };

      const response = await fetch('/api/llm/chat/stream', {
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
      {/* Toggle Button - fixed at bottom */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-zinc-950 border-t border-zinc-800">
        <div className="flex justify-center">
          <button
            onClick={() => setIsOpen(o => !o)}
            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-6 py-2 rounded-md shadow-lg border border-zinc-700 transition-colors"
          >
            💬 AI Assistant
          </button>
        </div>
      </div>

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
          className="bg-zinc-900 text-white rounded-lg shadow-xl border border-zinc-700 overflow-hidden z-50 absolute"
        >
          <div className="flex flex-col h-full">
          {/* Header */}
          <div className="chat-drag-handle flex items-center justify-between p-3 border-b border-zinc-700 bg-zinc-800 cursor-move flex-shrink-0">
            <h4 className="font-semibold text-zinc-200">{title}</h4>
            <button onClick={() => setIsOpen(false)} className="text-zinc-400 hover:text-zinc-200 text-xl">
              &times;
            </button>
          </div>

          {/* Messages */}
          <div 
            className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0"
            onWheel={(e) => {
              e.stopPropagation();
            }}
          >
            {messages.length === 0 && <p className="text-zinc-400 text-sm text-center">Say hi!</p>}
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'human' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] p-3 rounded-lg text-sm whitespace-pre-wrap ${
                    msg.role === 'human' ? 'bg-zinc-700 text-white' : 'bg-zinc-800 text-zinc-100 border border-zinc-700'
                  }`}
                >
                  {msg.content}
                  {msg.role === 'ai' && idx === messages.length - 1 && isLoading && <span className="animate-pulse">▋</span>}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-zinc-700 p-3 bg-zinc-900 flex-shrink-0">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={placeholder}
                disabled={isLoading}
                className="flex-1 px-3 py-2 bg-zinc-800 text-white border border-zinc-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-600 rounded-md disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Send'}
              </button>
            </form>
          </div>
          </div>
        </Rnd>
      )}
    </>
  );
}