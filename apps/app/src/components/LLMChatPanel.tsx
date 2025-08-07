import React from 'react';
import { LLMMessage } from '@/types/llm';
import { Trash2, Send } from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer';

interface LLMChatPanelProps {
  messages: LLMMessage[];
  input: string;
  setInput: (value: string) => void;
  isLoading: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  onSubmit: (e: React.FormEvent) => void;
  onClear: () => void;
  placeholder?: string;
}

export default function LLMChatPanel({
  messages,
  input,
  setInput,
  isLoading,
  messagesEndRef,
  onSubmit,
  onClear,
  placeholder = 'Ask me anything...'
}: LLMChatPanelProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit(e);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-zinc-800 bg-zinc-900 flex-shrink-0">
        <h4 className="text-sm font-medium text-zinc-400 uppercase tracking-wide">AI Assistant</h4>
        <button 
          onClick={onClear}
          className="flex items-center justify-center w-7 h-7 text-zinc-400 hover:text-red-400 hover:bg-red-900/20 rounded-md transition-colors"
          title="Clear Chat History"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-zinc-950 min-h-0">
        <div className="p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-8">
              <p className="text-zinc-500 text-sm">Ask me anything about your campaign!</p>
            </div>
          )}
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex items-start gap-3 p-3 rounded-lg shadow-sm transition-colors ${
              msg.role === 'human' 
                ? 'bg-amber-600/10 border border-amber-600/20 hover:bg-amber-600/15' 
                : 'bg-zinc-800/15 border border-zinc-800/25 hover:bg-zinc-800/20'
            }`}>
              <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium bg-zinc-700 text-zinc-300">
                {msg.role === 'human' ? 'U' : 'A'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-sm font-medium text-zinc-300">
                    {msg.role === 'human' ? 'User' : 'Assistant'}
                  </span>
                </div>
                <div className="text-sm text-zinc-100 leading-relaxed">
                  {msg.role === 'human' ? (
                    <span className="whitespace-pre-wrap">{msg.content}</span>
                  ) : (
                    <MarkdownRenderer 
                      content={msg.content} 
                      className="prose prose-sm prose-invert max-w-none prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0 prose-a:text-blue-400 prose-a:underline hover:prose-a:text-blue-300"
                    />
                  )}
                  {msg.role === 'ai' && idx === messages.length - 1 && isLoading && (
                    <span className="inline-block w-2 h-4 bg-zinc-300 animate-pulse ml-1 align-baseline">▋</span>
                  )}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-zinc-800 p-3 bg-zinc-900 flex-shrink-0">
        <form onSubmit={onSubmit} className="flex gap-2 items-end">
          <div className="flex-1">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={isLoading}
              rows={1}
              className="w-full px-3 py-2 text-sm bg-zinc-800 text-zinc-100 border border-zinc-700 rounded focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 disabled:opacity-50 placeholder-zinc-500 resize-none min-h-[36px] max-h-32"
              style={{
                height: 'auto',
                minHeight: '36px',
                maxHeight: '128px',
                overflow: input.split('\n').length > 3 ? 'auto' : 'hidden'
              }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = Math.min(target.scrollHeight, 128) + 'px';
              }}
            />
          </div>
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="flex items-center justify-center w-9 h-9 bg-amber-600 hover:bg-amber-700 disabled:bg-zinc-700 disabled:text-zinc-500 rounded disabled:cursor-not-allowed transition-colors border border-amber-500 hover:border-amber-400 flex-shrink-0"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-zinc-300 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send size={14} />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}