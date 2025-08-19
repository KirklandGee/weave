import { getDb } from '@/lib/db/campaignDB';

const CHAT_RETENTION_DAYS = 30;
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

export class ChatCleanupService {
  private campaign: string;
  private ownerId: string;

  constructor(campaign: string, ownerId: string) {
    this.campaign = campaign;
    this.ownerId = ownerId;
  }

  async cleanupExpiredChats(): Promise<{ deletedChats: number; deletedMessages: number }> {
    const db = getDb(this.campaign);
    const cutoffDate = Date.now() - (CHAT_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    
    let deletedChats = 0;
    let deletedMessages = 0;

    try {
      // Find expired chat sessions
      const expiredChats = await db.chats
        .where('[ownerId+campaignId]')
        .equals([this.ownerId, this.campaign])
        .and(chat => chat.updatedAt < cutoffDate)
        .toArray();

      if (expiredChats.length === 0) {
        return { deletedChats: 0, deletedMessages: 0 };
      }

      const now = Date.now();
      
      // Delete chat messages and track for sync
      for (const chat of expiredChats) {
        // Get messages for this chat
        const messages = await db.chatMessages
          .where('chatId')
          .equals(chat.id)
          .toArray();
        
        // Delete messages
        await db.chatMessages.where('chatId').equals(chat.id).delete();
        
        // Add delete changes for sync
        for (const message of messages) {
          await db.changes.add({
            op: 'delete',
            entity: 'chatMessages',
            entityId: message.id,
            payload: {},
            ts: now
          });
        }

        deletedMessages += messages.length;
      }

      // Delete chat sessions
      const chatIds = expiredChats.map(chat => chat.id);
      await db.chats.where('id').anyOf(chatIds).delete();
      
      // Add delete changes for sync
      for (const chat of expiredChats) {
        await db.changes.add({
          op: 'delete',
          entity: 'chats',
          entityId: chat.id,
          payload: {},
          ts: now
        });
      }

      deletedChats = expiredChats.length;

      console.log(`Cleaned up ${deletedChats} expired chats and ${deletedMessages} messages`);
      
      // Store last cleanup timestamp
      await db.metadata.put({
        id: 'lastChatCleanup',
        value: now,
        updatedAt: now
      });

      return { deletedChats, deletedMessages };

    } catch (error) {
      console.error('Chat cleanup failed:', error);
      return { deletedChats: 0, deletedMessages: 0 };
    }
  }

  async shouldRunCleanup(): Promise<boolean> {
    const db = getDb(this.campaign);
    
    try {
      const lastCleanup = await db.metadata.get('lastChatCleanup');
      if (!lastCleanup) {
        return true; // Never run cleanup before
      }

      const timeSinceLastCleanup = Date.now() - (lastCleanup.value as number);
      return timeSinceLastCleanup >= CLEANUP_INTERVAL_MS;

    } catch (error) {
      console.error('Error checking cleanup status:', error);
      return true; // Run cleanup on error to be safe
    }
  }

  async getCleanupStats(): Promise<{ expiredChatsCount: number; nextCleanupIn?: number }> {
    const db = getDb(this.campaign);
    const cutoffDate = Date.now() - (CHAT_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    
    try {
      const expiredChatsCount = await db.chats
        .where('[ownerId+campaignId]')
        .equals([this.ownerId, this.campaign])
        .and(chat => chat.updatedAt < cutoffDate)
        .count();

      // Calculate next cleanup time
      const lastCleanup = await db.metadata.get('lastChatCleanup');
      let nextCleanupIn: number | undefined;
      
      if (lastCleanup) {
        const nextCleanupTime = (lastCleanup.value as number) + CLEANUP_INTERVAL_MS;
        nextCleanupIn = Math.max(0, nextCleanupTime - Date.now());
      }

      return { expiredChatsCount, nextCleanupIn };

    } catch (error) {
      console.error('Error getting cleanup stats:', error);
      return { expiredChatsCount: 0 };
    }
  }
}

// Global cleanup function that can be called from anywhere
export async function runChatCleanupForCampaign(campaign: string, ownerId: string): Promise<{ deletedChats: number; deletedMessages: number }> {
  const cleanupService = new ChatCleanupService(campaign, ownerId);
  
  const shouldCleanup = await cleanupService.shouldRunCleanup();
  if (!shouldCleanup) {
    return { deletedChats: 0, deletedMessages: 0 };
  }

  return await cleanupService.cleanupExpiredChats();
}

// Hook to use cleanup service
export function useChatCleanup(campaign: string, ownerId: string, authFetch?: (url: string, options?: RequestInit) => Promise<Response>) {
  const service = new ChatCleanupService(campaign, ownerId);
  
  const shouldRunBackendCleanup = async (): Promise<boolean> => {
    const db = getDb(campaign);
    
    try {
      const lastBackendCleanup = await db.metadata.get('lastBackendChatCleanup');
      if (!lastBackendCleanup) {
        return true; // Never run backend cleanup before
      }

      const timeSinceLastCleanup = Date.now() - (lastBackendCleanup.value as number);
      return timeSinceLastCleanup >= CLEANUP_INTERVAL_MS;

    } catch (error) {
      console.error('Error checking backend cleanup status:', error);
      return true; // Run cleanup on error to be safe
    }
  };

  const runBackendCleanup = async (): Promise<{ deletedChats: number; deletedMessages: number }> => {
    if (!authFetch) {
      console.warn('AuthFetch not available, skipping backend cleanup');
      return { deletedChats: 0, deletedMessages: 0 };
    }

    // Check if backend cleanup should run
    const shouldCleanup = await shouldRunBackendCleanup();
    if (!shouldCleanup) {
      console.log('Skipping backend cleanup - ran within last 24 hours');
      return { deletedChats: 0, deletedMessages: 0 };
    }

    const db = getDb(campaign);
    const now = Date.now();

    try {
      console.log(`Running backend cleanup for campaign: ${campaign}`);
      const response = await authFetch(`/api/chat-cleanup/cleanup/${campaign}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Backend cleanup failed: ${response.status} - ${errorText}`);
        return { deletedChats: 0, deletedMessages: 0 };
      }

      const result = await response.json();
      console.log('Backend cleanup successful:', result);
      
      // Store last backend cleanup timestamp
      await db.metadata.put({
        id: 'lastBackendChatCleanup',
        value: now,
        updatedAt: now
      });

      return {
        deletedChats: result.deleted_chats || 0,
        deletedMessages: result.deleted_messages || 0
      };
    } catch (error) {
      console.error('Backend cleanup error:', error);
      return { deletedChats: 0, deletedMessages: 0 };
    }
  };

  const runFullCleanup = async () => {
    // Check if local cleanup should run first
    const shouldLocalCleanup = await service.shouldRunCleanup();
    const shouldBackend = await shouldRunBackendCleanup();
    
    if (!shouldLocalCleanup && !shouldBackend) {
      return {
        deletedChats: 0,
        deletedMessages: 0,
        localResults: { deletedChats: 0, deletedMessages: 0 },
        backendResults: { deletedChats: 0, deletedMessages: 0 }
      };
    }
    
    // Run local cleanup first (but only if needed)
    const localResults = shouldLocalCleanup 
      ? await runChatCleanupForCampaign(campaign, ownerId)
      : { deletedChats: 0, deletedMessages: 0 };
    
    // Run backend cleanup independently based on its own schedule
    const backendResults = await runBackendCleanup();
    
    return {
      deletedChats: localResults.deletedChats + backendResults.deletedChats,
      deletedMessages: localResults.deletedMessages + backendResults.deletedMessages,
      localResults,
      backendResults
    };
  };
  
  return {
    cleanupExpiredChats: service.cleanupExpiredChats.bind(service),
    shouldRunCleanup: service.shouldRunCleanup.bind(service),
    shouldRunBackendCleanup,
    getCleanupStats: service.getCleanupStats.bind(service),
    runCleanup: runFullCleanup,
    runLocalCleanup: () => runChatCleanupForCampaign(campaign, ownerId),
    runBackendCleanup
  };
}