import { useState, useRef } from 'react';
import { ChatRequest, LLMMessage } from '@/types/llm';
import { useLLMContext } from '@/lib/hooks/useLLMContext';
import { useTemplateContext } from '@/lib/hooks/useTemplateContext';
import { useAuthFetch } from '@/utils/authFetch.client';
import { useUser } from '@clerk/nextjs';
import { useActiveNode } from './useActiveNode';
import { useRelationships } from './useRelationships';
import { useLiveQuery } from 'dexie-react-hooks';
import { getDb } from '@/lib/db/campaignDB';
import { Note } from '@/types/node';

interface ToolCall {
  id: string;
  name: string;
  description: string;
  args: Record<string, unknown>;
}

export function useLLMChat(campaign: string, activeNodeId: string) {
  const { user } = useUser();
  const contextString = useLLMContext(campaign, activeNodeId);
  const templateContextString = useTemplateContext(campaign, activeNodeId);
  const authFetch = useAuthFetch();
  
  // Get current note info
  const { title: currentNoteTitle } = useActiveNode(campaign, activeNodeId);
  
  // Get current note object for relationships hook
  const db = getDb(campaign);
  const currentNote = useLiveQuery(() => db.nodes.get(activeNodeId), [activeNodeId]);
  
  // Create fallback note object if needed
  const fallbackNote: Note = {
    id: activeNodeId,
    title: currentNoteTitle || 'Untitled',
    ownerId: user?.id || '',
    campaignId: campaign,
    campaignIds: [campaign],
    type: 'Note',
    markdown: '',
    updatedAt: Date.now(),
    createdAt: Date.now(),
    attributes: {}
  };
  
  // Get relationships using existing hook
  const { relationships } = useRelationships({ 
    currentNote: currentNote || fallbackNote,
    campaignSlug: campaign 
  });
  
  // Extract related notes metadata from relationships
  const relatedNotesMetadata = relationships.map(rel => {
    // Get the other node in the relationship (not the current node)
    const relatedNodeId = rel.fromId === activeNodeId ? rel.toId : rel.fromId;
    const relatedNodeTitle = rel.fromId === activeNodeId ? rel.toTitle : rel.fromTitle;
    return {
      id: relatedNodeId,
      title: relatedNodeTitle
    };
  });
  
  const [messages, setMessages] = useState<LLMMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Agent mode states
  const [agentMode, setAgentMode] = useState(false);
  const [pendingTools, setPendingTools] = useState<ToolCall[]>([]);
  const [showToolApproval, setShowToolApproval] = useState(false);
  const [isExecutingTools, setIsExecutingTools] = useState(false);

  // Note: Removed auto-scroll to avoid interrupting user reading experience

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    // Ensure user is loaded before proceeding
    if (!user?.id) {
      console.error('User not authenticated');
      return;
    }

    const userMessage: LLMMessage = { role: 'human', content: input.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      if (agentMode) {
        await handleAgentMode([...messages, userMessage]);
      } else {
        await handleNormalMode([...messages, userMessage]);
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'ai', content: 'Error processing request, please try again.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNormalMode = async (allMessages: LLMMessage[]) => {
    const chatRequest: ChatRequest = {
      user_id: user!.id,
      messages: allMessages,
      metadata: {
        current_note: {
          id: activeNodeId,
          title: currentNoteTitle || 'Untitled'
        },
        related_notes: relatedNotesMetadata
      },
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
  };

  const handleAgentMode = async (allMessages: LLMMessage[]) => {
    const agentRequest = {
      messages: allMessages,
      campaign_id: campaign,
      context: contextString,
      max_iterations: 3
    };

    const response = await authFetch('/api/agent/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(agentRequest),
    });

    if (!response.ok) throw new Error(`Agent error! status: ${response.status}`);

    await handleAgentResponse(response);
  };

  const handleAgentResponse = async (response: Response) => {
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No reader available');

    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += new TextDecoder().decode(value);
      
      // Process complete SSE messages
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            
            if (data.type === 'tool_calls') {
              // Show tool approval modal
              setPendingTools(data.tool_calls);
              setShowToolApproval(true);
              
              // Add AI message if present
              if (data.ai_message) {
                setMessages(prev => [...prev, {
                  role: 'ai',
                  content: data.ai_message
                }]);
              }
              
              // Add system message about pending approval
              const toolList = data.tool_calls
                .map((tc: ToolCall) => `🔧 ${tc.name}: ${tc.description}`)
                .join('\n');
                
              setMessages(prev => [...prev, {
                role: 'system',
                content: `⏳ **Waiting for your approval to perform these actions:**\n\n${toolList}\n\n*Please review and approve the actions above.*`
              }]);
              
            } else if (data.type === 'final_response') {
              setMessages(prev => [...prev, {
                role: 'ai',
                content: data.content
              }]);
            } else if (data.type === 'error') {
              setMessages(prev => [...prev, {
                role: 'ai',
                content: `❌ Error: ${data.error}`
              }]);
            }
          } catch (e) {
            console.error('Error parsing SSE data:', e);
          }
        }
      }
    }
  };

  const handleToolApproval = async (approvedTools: ToolCall[]) => {
    setIsExecutingTools(true);
    
    try {
      const response = await authFetch('/api/agent/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages,
          approved_tool_calls: approvedTools,
          campaign_id: campaign,
          context: contextString
        })
      });

      if (!response.ok) throw new Error(`Tool execution failed: ${response.status}`);

      // Stream the final response
      await handleToolExecutionStreaming(response);
      
    } catch (error) {
      console.error('Tool execution error:', error);
      setMessages(prev => [...prev, {
        role: 'ai',
        content: `❌ Error executing tools: ${error instanceof Error ? error.message : 'Unknown error'}`
      }]);
    } finally {
      setIsExecutingTools(false);
      setShowToolApproval(false);
      setPendingTools([]);
    }
  };

  const handleToolExecutionStreaming = async (response: Response) => {
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No reader available');

    let accumulated = '';
    setMessages(prev => [...prev, { role: 'ai', content: '' }]);

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = new TextDecoder().decode(value);
      if (chunk.startsWith('data: ')) {
        const content = chunk.slice(6);
        accumulated += content;
        
        setMessages(prev => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: 'ai', content: accumulated };
          return copy;
        });
      }
    }
  };

  const handleToolDecline = () => {
    setShowToolApproval(false);
    setPendingTools([]);
    setMessages(prev => [...prev, {
      role: 'ai',
      content: '✋ Tool execution declined. How else can I help you?'
    }]);
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
    // Agent mode functionality
    agentMode,
    setAgentMode,
    pendingTools,
    showToolApproval,
    isExecutingTools,
    handleToolApproval,
    handleToolDecline,
  };
}