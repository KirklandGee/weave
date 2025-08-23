import React, { useState, useEffect } from 'react';
import type { Note } from '@/types/node';
import { RelationshipsSection } from './Relationships';
import LLMChatPanel from './LLMChatPanel';
import { useLLMChat } from '@/lib/hooks/useLLMChat';
import { MessageSquare, Network, ChevronRight } from 'lucide-react';
import { AIFeatureProtection } from './AIFeatureProtection';

type RightSidebarMode = 'relationships' | 'ai-chat';

type RightSidebarProps = {
  node: Note | null;
  campaign: string;
  activeNodeId: string;
  onNavigateToNote?: (noteId: string) => void;
  onHide?: () => void;
  initialMode?: RightSidebarMode;
  onModeChange?: (mode: RightSidebarMode) => void;
}

export default function RightSidebar({ 
  node, 
  campaign,
  activeNodeId,
  onNavigateToNote, 
  onHide,
  initialMode = 'relationships',
  onModeChange
}: RightSidebarProps) {
  const [mode, setMode] = useState<RightSidebarMode>(initialMode);
  
  // Sync internal mode with external initialMode prop
  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);
  
  const handleModeChange = (newMode: RightSidebarMode) => {
    setMode(newMode);
    onModeChange?.(newMode);
  };
  
  const {
    messages,
    input,
    setInput,
    isLoading,
    isCompacting,
    messagesEndRef,
    handleSubmit,
    clearChat,
    chatSessions,
    currentChatId,
    onNewChat,
    onSwitchChat,
    onDeleteChat,
    onCompactChat,
    checkCompactionStatus,
  } = useLLMChat(campaign, activeNodeId);

  if (!node) return null;

  const showContent = Object.keys(node.attributes ?? {}).length > 0 || node.id;
  if (!showContent && mode === 'relationships') return null;

  return (
    <aside className="h-full flex flex-col overflow-hidden text-zinc-200 bg-zinc-900">
      {/* Header with toggle buttons */}
      <div className="flex-shrink-0 border-b border-zinc-800 bg-zinc-900">
        <div className="flex items-center justify-between p-3">
          {onHide && (
            <button
              onClick={onHide}
              className="text-zinc-500 hover:text-zinc-300 transition-colors p-1 rounded hover:bg-zinc-800"
              aria-label="Hide right sidebar"
            >
              <ChevronRight size={14} />
            </button>
          )}
          
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleModeChange('relationships')}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                mode === 'relationships'
                  ? 'bg-zinc-800 text-zinc-200 border border-zinc-700'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              <Network size={14} />
              Relationships
            </button>
            <AIFeatureProtection feature="AI Chat" fallbackType="none">
              <button
                onClick={() => handleModeChange('ai-chat')}
                className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  mode === 'ai-chat'
                    ? 'bg-zinc-800 text-zinc-200 border border-zinc-700'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                }`}
              >
                <MessageSquare size={14} />
                AI Chat
              </button>
            </AIFeatureProtection>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {mode === 'relationships' ? (
          <div className="h-full overflow-y-auto p-3">
            <RelationshipsSection
              currentNote={node}
              onNavigateToNote={onNavigateToNote}
            />
          </div>
        ) : (
          <AIFeatureProtection feature="AI Chat" fallbackType="full">
            <LLMChatPanel
              messages={messages}
              input={input}
              setInput={setInput}
              isLoading={isLoading}
              isCompacting={isCompacting}
              messagesEndRef={messagesEndRef}
              onSubmit={handleSubmit}
              onClear={clearChat}
              chatSessions={chatSessions}
              currentChatId={currentChatId}
              onNewChat={onNewChat}
              onSwitchChat={onSwitchChat}
              onDeleteChat={onDeleteChat}
              onCompactChat={onCompactChat}
              checkCompactionStatus={checkCompactionStatus}
            />
          </AIFeatureProtection>
        )}
      </div>
    </aside>
  );
}