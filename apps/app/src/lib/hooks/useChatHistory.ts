import { useState, useEffect, useCallback } from 'react';
import { getDb, ChatSession, ChatMessage } from '@/lib/db/campaignDB';
import { useChatCompaction } from '@/lib/chat/compaction';
import { useChatCleanup } from '@/lib/chat/cleanup';

export function useChatHistory(campaign: string, ownerId: string, authFetch?: (url: string, options?: RequestInit) => Promise<Response>) {
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCompacting, setIsCompacting] = useState(false);

  const db = getDb(campaign);
  const { compactChat, getStatus } = useChatCompaction(campaign, ownerId);
  const { runCleanup } = useChatCleanup(campaign, ownerId, authFetch);

  const createNewChat = useCallback(async (title?: string, contextNodeId?: string): Promise<string> => {
    const chatId = crypto.randomUUID();
    const now = Date.now();
    
    const newChat: ChatSession = {
      id: chatId,
      campaignId: campaign,
      ownerId,
      title: title || 'New Chat',
      contextNodeId,
      createdAt: now,
      updatedAt: now,
      messageCount: 0,
      isCompacted: false
    };

    await db.chats.add(newChat);
    
    // Add to changes for sync
    await db.changes.add({
      op: 'create',
      entity: 'chats',
      entityId: chatId,
      payload: newChat,
      ts: now
    });

    setChatSessions(prev => [newChat, ...prev]);
    setCurrentChatId(chatId);
    setMessages([]);
    
    return chatId;
  }, [campaign, ownerId, db.chats, db.changes, setChatSessions, setCurrentChatId, setMessages]);

  // Load chat sessions on mount
  useEffect(() => {
    const loadChatSessions = async () => {
      try {
        const sessions = await db.chats
          .where('[ownerId+campaignId]')
          .equals([ownerId, campaign])
          .toArray();
        
        // Sort by updatedAt in descending order (most recent first)
        sessions.sort((a, b) => b.updatedAt - a.updatedAt);
        
        setChatSessions(sessions);
        
        // Auto-select first session or create new one if none exist
        // But only if we don't already have a current chat selected
        if (sessions.length > 0) {
          if (!currentChatId || !sessions.find(s => s.id === currentChatId)) {
            console.log('Auto-selecting first chat:', sessions[0].id);
            setCurrentChatId(sessions[0].id);
          } else {
            console.log('Keeping current chat:', currentChatId);
          }
        } else {
          await createNewChat();
        }
      } catch (error) {
        console.error('Failed to load chat sessions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadChatSessions();
  }, [campaign, ownerId, createNewChat, currentChatId, db.chats]);

  // Load messages when chat changes
  useEffect(() => {
    const loadMessages = async () => {
      if (!currentChatId) {
        console.log('No currentChatId, clearing messages');
        setMessages([]);
        return;
      }
      
      console.log('Loading messages for chat:', currentChatId);
      
      try {
        const msgs = await db.chatMessages
          .where('chatId')
          .equals(currentChatId)
          .toArray();
        
        // Sort by createdAt in ascending order (oldest first)
        msgs.sort((a, b) => a.createdAt - b.createdAt);
        
        console.log(`Loaded ${msgs.length} messages for chat ${currentChatId}`);
        setMessages(msgs);
      } catch (error) {
        console.error('Failed to load messages:', error);
        setMessages([]);
      }
    };

    loadMessages();
  }, [currentChatId, db]);

  // Run cleanup only once on mount, not on every render
  useEffect(() => {
    const runInitialCleanup = async () => {
      try {
        // Only run cleanup if it should actually run (checks 24hr interval)
        await runCleanup();
      } catch (error) {
        console.error('Initial cleanup failed:', error);
      }
    };
    
    runInitialCleanup();
  }, [campaign, ownerId]); // Only depend on stable values - runs once per campaign/owner


  const addMessage = async (role: 'human' | 'ai' | 'system', content: string, metadata?: Record<string, unknown>) => {
    if (!currentChatId) return;

    const messageId = crypto.randomUUID();
    const now = Date.now();

    const newMessage: ChatMessage = {
      id: messageId,
      chatId: currentChatId,
      campaignId: campaign,
      ownerId,
      role,
      content,
      createdAt: now,
      metadata,
      isCompacted: false
    };

    await db.chatMessages.add(newMessage);
    
    // Add to changes for sync
    await db.changes.add({
      op: 'create',
      entity: 'chatMessages',
      entityId: messageId,
      payload: newMessage,
      ts: now
    });

    // Update chat session message count and updatedAt
    const session = chatSessions.find(s => s.id === currentChatId);
    if (session) {
      const updatedSession = {
        ...session,
        messageCount: session.messageCount + 1,
        updatedAt: now,
        // Update title from first user message if still "New Chat"
        title: session.title === 'New Chat' && role === 'human' 
          ? content.slice(0, 50) + (content.length > 50 ? '...' : '')
          : session.title
      };

      await db.chats.put(updatedSession);
      
      // Add to changes for sync
      await db.changes.add({
        op: 'update',
        entity: 'chats',
        entityId: currentChatId,
        payload: updatedSession,
        ts: now
      });

      setChatSessions(prev => prev.map(s => s.id === currentChatId ? updatedSession : s));
    }

    setMessages(prev => [...prev, newMessage]);
    return messageId;
  };

  const updateMessage = async (messageId: string, content: string) => {
    if (!messageId) return;

    const now = Date.now();
    
    try {
      // Update message in database
      await db.chatMessages.where('id').equals(messageId).modify({ content });
      
      // Add to changes for sync
      await db.changes.add({
        op: 'update',
        entity: 'chatMessages',
        entityId: messageId,
        payload: { content },
        ts: now
      });

      // Update local state
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, content } : msg
      ));

    } catch (error) {
      console.error('Failed to update message:', error);
    }
  };

  const switchToChat = (chatId: string) => {
    console.log('Switching to chat:', chatId, 'from:', currentChatId);
    setCurrentChatId(chatId);
  };

  const deleteChat = async (chatId: string) => {
    const now = Date.now();
    
    // Delete messages
    const messagesToDelete = await db.chatMessages.where('chatId').equals(chatId).toArray();
    await db.chatMessages.where('chatId').equals(chatId).delete();
    
    // Delete chat session
    await db.chats.delete(chatId);

    // Add delete changes for sync
    for (const msg of messagesToDelete) {
      await db.changes.add({
        op: 'delete',
        entity: 'chatMessages',
        entityId: msg.id,
        payload: {},
        ts: now
      });
    }
    
    await db.changes.add({
      op: 'delete',
      entity: 'chats',
      entityId: chatId,
      payload: {},
      ts: now
    });

    setChatSessions(prev => prev.filter(s => s.id !== chatId));
    
    // If we deleted the current chat, switch to another one or create new
    if (currentChatId === chatId) {
      const remainingSessions = chatSessions.filter(s => s.id !== chatId);
      if (remainingSessions.length > 0) {
        setCurrentChatId(remainingSessions[0].id);
      } else {
        await createNewChat();
      }
    }
  };

  const clearCurrentChat = async () => {
    if (!currentChatId) return;

    const now = Date.now();
    
    // Get messages to delete
    const messagesToDelete = await db.chatMessages.where('chatId').equals(currentChatId).toArray();
    await db.chatMessages.where('chatId').equals(currentChatId).delete();

    // Add delete changes for sync
    for (const msg of messagesToDelete) {
      await db.changes.add({
        op: 'delete',
        entity: 'chatMessages',
        entityId: msg.id,
        payload: {},
        ts: now
      });
    }

    // Reset chat session
    const session = chatSessions.find(s => s.id === currentChatId);
    if (session) {
      const resetSession = {
        ...session,
        messageCount: 0,
        updatedAt: now,
        isCompacted: false
      };

      await db.chats.put(resetSession);
      
      await db.changes.add({
        op: 'update',
        entity: 'chats',
        entityId: currentChatId,
        payload: resetSession,
        ts: now
      });

      setChatSessions(prev => prev.map(s => s.id === currentChatId ? resetSession : s));
    }

    setMessages([]);
  };

  const compactCurrentChat = async () => {
    if (!currentChatId || !authFetch) return null;

    setIsCompacting(true);
    try {
      const result = await compactChat(currentChatId, authFetch);
      
      if (result) {
        // Reload messages to show the compacted version
        const msgs = await db.chatMessages
          .where('chatId')
          .equals(currentChatId)
          .toArray();
        
        // Sort by createdAt in ascending order (oldest first)
        msgs.sort((a, b) => a.createdAt - b.createdAt);
        
        setMessages(msgs);
        
        // Update session in state
        setChatSessions(prev => prev.map(s => {
          if (s.id === currentChatId) {
            return { ...s, isCompacted: true, updatedAt: Date.now() };
          }
          return s;
        }));
      }
      
      return result;
    } catch (error) {
      console.error('Compaction failed:', error);
      return null;
    } finally {
      setIsCompacting(false);
    }
  };

  const checkCompactionStatus = async (chatId: string) => {
    return await getStatus(chatId);
  };

  return {
    chatSessions,
    currentChatId,
    messages,
    isLoading,
    isCompacting,
    createNewChat,
    addMessage,
    updateMessage,
    switchToChat,
    deleteChat,
    clearCurrentChat,
    compactCurrentChat,
    checkCompactionStatus
  };
}