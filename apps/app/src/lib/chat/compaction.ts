import { getDb, ChatMessage, ChatSession } from '@/lib/db/campaignDB';

const COMPACTION_THRESHOLD = 50; // Messages before compaction
const KEEP_RECENT_COUNT = 20; // Messages to keep uncompacted

interface CompactionResult {
  summarizedContent: string;
  messageCount: number;
  tokensSaved: number; // Rough estimate
}

export class ChatCompactionService {
  private campaign: string;
  private ownerId: string;

  constructor(campaign: string, ownerId: string) {
    this.campaign = campaign;
    this.ownerId = ownerId;
  }

  async shouldCompact(chatId: string): Promise<boolean> {
    const db = getDb(this.campaign);
    const messageCount = await db.chatMessages.where('chatId').equals(chatId).count();
    return messageCount > COMPACTION_THRESHOLD;
  }

  async compactChatHistory(chatId: string, authFetch: (url: string, options?: RequestInit) => Promise<Response>): Promise<CompactionResult | null> {
    const db = getDb(this.campaign);
    
    // Get all messages for this chat, ordered by creation time
    const allMessages = await db.chatMessages
      .where('chatId')
      .equals(chatId)
      .orderBy('createdAt')
      .toArray();

    if (allMessages.length <= COMPACTION_THRESHOLD) {
      return null; // No need to compact
    }

    // Split into messages to compact and recent messages to keep
    const messagesToCompact = allMessages.slice(0, -KEEP_RECENT_COUNT);
    const recentMessages = allMessages.slice(-KEEP_RECENT_COUNT);

    if (messagesToCompact.length === 0) {
      return null;
    }

    // Check if any messages are already compacted (avoid re-compacting)
    const uncompactedMessages = messagesToCompact.filter(msg => !msg.isCompacted);
    if (uncompactedMessages.length === 0) {
      return null;
    }

    try {
      // Create summary using LLM
      const summary = await this.createSummary(uncompactedMessages, authFetch);
      
      if (!summary) {
        throw new Error('Failed to create summary');
      }

      // Create a single compacted message to replace the old messages
      const compactedMessageId = crypto.randomUUID();
      const now = Date.now();
      
      const compactedMessage: ChatMessage = {
        id: compactedMessageId,
        chatId,
        campaignId: this.campaign,
        ownerId: this.ownerId,
        role: 'system',
        content: `**[Conversation Summary - ${uncompactedMessages.length} messages compacted]**\n\n${summary}`,
        createdAt: uncompactedMessages[0].createdAt, // Use timestamp of first message
        isCompacted: true,
        metadata: {
          compactionId: crypto.randomUUID(),
          originalMessageCount: uncompactedMessages.length,
          compactedAt: now,
          messageRange: {
            from: uncompactedMessages[0].createdAt,
            to: uncompactedMessages[uncompactedMessages.length - 1].createdAt
          }
        }
      };

      // Start transaction to update the database
      await db.transaction('rw', db.chatMessages, db.changes, async () => {
        // Add the compacted message
        await db.chatMessages.add(compactedMessage);
        
        // Delete the original messages
        const messageIdsToDelete = uncompactedMessages.map(msg => msg.id);
        await db.chatMessages.where('id').anyOf(messageIdsToDelete).delete();

        // Add sync changes
        await db.changes.add({
          op: 'create',
          entity: 'chatMessages',
          entityId: compactedMessageId,
          payload: compactedMessage,
          ts: now
        });

        for (const msgId of messageIdsToDelete) {
          await db.changes.add({
            op: 'delete',
            entity: 'chatMessages',
            entityId: msgId,
            payload: {},
            ts: now
          });
        }
      });

      // Update chat session to mark as compacted
      const session = await db.chats.get(chatId);
      if (session) {
        const updatedSession = {
          ...session,
          isCompacted: true,
          updatedAt: now
        };
        
        await db.chats.put(updatedSession);
        await db.changes.add({
          op: 'update',
          entity: 'chats',
          entityId: chatId,
          payload: updatedSession,
          ts: now
        });
      }

      // Calculate rough token savings (assume ~4 chars per token)
      const originalContentLength = uncompactedMessages.reduce((sum, msg) => sum + msg.content.length, 0);
      const newContentLength = summary.length;
      const tokensSaved = Math.max(0, Math.floor((originalContentLength - newContentLength) / 4));

      return {
        summarizedContent: summary,
        messageCount: uncompactedMessages.length,
        tokensSaved
      };

    } catch (error) {
      console.error('Compaction failed:', error);
      return null;
    }
  }

  private async createSummary(messages: ChatMessage[], authFetch: (url: string, options?: RequestInit) => Promise<Response>): Promise<string | null> {
    try {
      // Prepare conversation for summarization
      const conversationText = messages
        .map(msg => `${msg.role === 'human' ? 'User' : msg.role === 'ai' ? 'Assistant' : 'System'}: ${msg.content}`)
        .join('\n\n');

      const summaryRequest = {
        user_id: this.ownerId,
        messages: [
          {
            role: 'system',
            content: `You are helping to summarize a conversation to reduce token usage while preserving important information. 
            
            Please create a concise but comprehensive summary that:
            1. Captures the key topics discussed
            2. Preserves important facts, decisions, or insights
            3. Maintains context for future conversation
            4. Uses about 1/3 the length of the original
            
            Format as a clear, readable summary in past tense.`
          },
          {
            role: 'human', 
            content: `Please summarize this conversation:\n\n${conversationText}`
          }
        ],
        metadata: {},
        context: ''
      };

      const response = await authFetch('/api/llm/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(summaryRequest),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Read the streaming response
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      let summary = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = new TextDecoder().decode(value);
        summary += chunk;
      }

      return summary.trim() || null;

    } catch (error) {
      console.error('Summary creation failed:', error);
      return null;
    }
  }

  async getCompactionStatus(chatId: string): Promise<{ needsCompaction: boolean; messageCount: number; estimatedTokens: number }> {
    const db = getDb(this.campaign);
    const messages = await db.chatMessages.where('chatId').equals(chatId).toArray();
    const messageCount = messages.length;
    const needsCompaction = messageCount > COMPACTION_THRESHOLD;
    
    // Rough token estimate (4 chars per token)
    const totalChars = messages.reduce((sum, msg) => sum + msg.content.length, 0);
    const estimatedTokens = Math.floor(totalChars / 4);

    return {
      needsCompaction,
      messageCount,
      estimatedTokens
    };
  }
}

// Hook to use compaction service
export function useChatCompaction(campaign: string, ownerId: string) {
  const service = new ChatCompactionService(campaign, ownerId);
  
  return {
    compactChat: service.compactChatHistory.bind(service),
    shouldCompact: service.shouldCompact.bind(service),
    getStatus: service.getCompactionStatus.bind(service)
  };
}