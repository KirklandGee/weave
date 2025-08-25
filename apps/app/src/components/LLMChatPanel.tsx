import React, { useState, useEffect } from 'react';
import { LLMMessage } from '@/types/llm';
import { Trash2, Send, Plus, MessageSquare, ChevronDown, Zap, AlertTriangle } from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer';
import { ChatSession } from '@/lib/db/campaignDB';

interface LLMChatPanelProps {
  messages: LLMMessage[];
  input: string;
  setInput: (value: string) => void;
  isLoading: boolean;
  isCompacting?: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  onSubmit: (e: React.FormEvent) => void;
  onClear: () => void;
  placeholder?: string;
  // Chat session management
  chatSessions?: ChatSession[];
  currentChatId?: string | null;
  onNewChat?: () => void;
  onSwitchChat?: (chatId: string) => void;
  onDeleteChat?: (chatId: string) => void;
  onCompactChat?: () => Promise<{ summarizedContent: string; messageCount: number; tokensSaved: number } | null>;
  checkCompactionStatus?: (chatId: string) => Promise<{ needsCompaction: boolean; messageCount: number; estimatedTokens: number }>;
}

export default function LLMChatPanel({
  messages,
  input,
  setInput,
  isLoading,
  isCompacting = false,
  messagesEndRef,
  onSubmit,
  onClear,
  placeholder = 'Ask me anything...',
  chatSessions = [],
  currentChatId,
  onNewChat,
  onSwitchChat,
  onDeleteChat,
  onCompactChat,
  checkCompactionStatus
}: LLMChatPanelProps) {
  const [showChatDropdown, setShowChatDropdown] = useState(false);
  const [compactionStatus, setCompactionStatus] = useState<{ needsCompaction: boolean; messageCount: number; estimatedTokens: number } | null>(null);
  
  // Check compaction status when currentChatId changes
  useEffect(() => {
    if (currentChatId && checkCompactionStatus) {
      checkCompactionStatus(currentChatId).then(status => {
        setCompactionStatus(status);
      });
    } else {
      setCompactionStatus(null);
    }
  }, [currentChatId, messages.length, checkCompactionStatus]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit(e);
    }
  };

  const handleCompact = async () => {
    if (onCompactChat) {
      const result = await onCompactChat();
      if (result) {
        // Refresh compaction status
        if (currentChatId && checkCompactionStatus) {
          const status = await checkCompactionStatus(currentChatId);
          setCompactionStatus(status);
        }
      }
    }
  };

  const currentChat = chatSessions.find(chat => chat.id === currentChatId);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-zinc-800 bg-zinc-900 flex-shrink-0">
        <div className="flex items-center gap-2">
          {chatSessions.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowChatDropdown(!showChatDropdown)}
                className="flex items-center gap-1 px-2 py-1 text-xs text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded border border-zinc-700 transition-colors"
              >
                <MessageSquare size={12} />
                <span className="max-w-24 truncate">
                  {currentChat?.title || 'Select Chat'}
                </span>
                <ChevronDown size={12} className={`transition-transform ${showChatDropdown ? 'rotate-180' : ''}`} />
              </button>
              
              {showChatDropdown && (
                <div className="absolute top-full left-0 mt-1 w-64 bg-zinc-800 border border-zinc-700 rounded shadow-lg z-50">
                  <div className="max-h-48 overflow-y-auto">
                    {onNewChat && (
                      <button
                        onClick={() => {
                          onNewChat();
                          setShowChatDropdown(false);
                        }}
                        className="w-full px-3 py-2 text-left text-xs text-zinc-300 hover:bg-zinc-700 flex items-center gap-2 border-b border-zinc-700"
                      >
                        <Plus size={12} />
                        New Chat
                      </button>
                    )}
                    {chatSessions.map(chat => (
                      <div key={chat.id} className="flex items-center">
                        <button
                          onClick={() => {
                            onSwitchChat?.(chat.id);
                            setShowChatDropdown(false);
                          }}
                          className={`flex-1 px-3 py-2 text-left text-xs hover:bg-zinc-700 transition-colors ${
                            chat.id === currentChatId ? 'bg-zinc-700 text-amber-400' : 'text-zinc-300'
                          }`}
                        >
                          <div className="truncate font-medium">{chat.title}</div>
                          <div className="text-zinc-500 text-xs">
                            {chat.messageCount} messages • {new Date(chat.updatedAt).toLocaleDateString()}
                          </div>
                        </button>
                        {onDeleteChat && chatSessions.length > 1 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteChat(chat.id);
                            }}
                            className="px-2 py-2 text-zinc-500 hover:text-red-400 hover:bg-red-900/20"
                            title="Delete Chat"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          {compactionStatus?.needsCompaction && onCompactChat && (
            <button 
              onClick={handleCompact}
              disabled={isCompacting}
              className="flex items-center justify-center w-7 h-7 text-amber-400 hover:text-amber-300 hover:bg-amber-900/20 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title={`Compact chat (${compactionStatus.messageCount} messages, ~${compactionStatus.estimatedTokens} tokens)`}
            >
              {isCompacting ? (
                <div className="w-3 h-3 border border-amber-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Zap size={14} />
              )}
            </button>
          )}
          {onNewChat && (
            <button 
              onClick={onNewChat}
              className="flex items-center justify-center w-7 h-7 text-zinc-400 hover:text-amber-400 hover:bg-amber-900/20 rounded-md transition-colors"
              title="New Chat"
            >
              <Plus size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-zinc-950 min-h-0">
        <div className="p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-8">
              <p className="text-zinc-500 text-sm">Ask me anything about your campaign!</p>
            </div>
          )}
          {compactionStatus?.needsCompaction && (
            <div className="bg-amber-900/20 border border-amber-600/20 rounded-lg p-3 mb-4">
              <div className="flex items-center gap-2 text-amber-400">
                <AlertTriangle size={16} />
                <span className="text-sm font-medium">Chat Getting Long</span>
              </div>
              <p className="text-xs text-amber-300 mt-1">
                {compactionStatus.messageCount} messages (~{compactionStatus.estimatedTokens} tokens). 
                Consider compacting to improve performance and reduce costs.
              </p>
              {onCompactChat && (
                <button
                  onClick={handleCompact}
                  disabled={isCompacting}
                  className="mt-2 px-3 py-1 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-800 text-white text-xs rounded disabled:cursor-not-allowed transition-colors"
                >
                  {isCompacting ? 'Compacting...' : 'Compact Now'}
                </button>
              )}
            </div>
          )}
          {isCompacting && (
            <div className="bg-blue-900/20 border border-blue-600/20 rounded-lg p-3 mb-4">
              <div className="flex items-center gap-2 text-blue-400">
                <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm font-medium">Compacting conversation...</span>
              </div>
              <p className="text-xs text-blue-300 mt-1">
                Summarizing older messages to reduce token usage.
              </p>
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
              <div className="flex-1 min-w-0 chat-message-content">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-sm font-medium text-zinc-300">
                    {msg.role === 'human' ? 'User' : 'Assistant'}
                  </span>
                </div>
                <div className="text-sm text-zinc-100 leading-relaxed chat-message-content">
                  {msg.role === 'human' ? (
                    <span className="whitespace-pre-wrap chat-message-content">{msg.content}</span>
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