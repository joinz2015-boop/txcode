import { messageRepository, MessageRow } from '../../repository/message.repository.js';
import { Message } from './memory.types.js';

export class MemoryService {
  addMessage(
    sessionId: string,
    role: 'user' | 'assistant' | 'system' | 'tool',
    content: string,
    keepContext: boolean = true,
    isOriginal: boolean = false
  ): number {
    return messageRepository.insert({ sessionId, role, content, keepContext, isOriginal });
  }

  getMessage(id: number): Message | undefined {
    const row = messageRepository.getById(id);
    return row ? this.rowToMessage(row) : undefined;
  }

  getAllMessages(sessionId: string): Message[] {
    return messageRepository.getAll(sessionId).map(this.rowToMessage);
  }

  getPermanentMessages(sessionId: string): Message[] {
    return messageRepository.getPermanent(sessionId).map(this.rowToMessage);
  }

  getTemporaryMessages(sessionId: string): Message[] {
    return messageRepository.getTemporary(sessionId).map(this.rowToMessage);
  }

  getMessagesFrom(fromId: number, keepContextOnly: boolean = true): Message[] {
    const message = messageRepository.getById(fromId);
    if (!message) return [];
    return messageRepository.getFromId(message.session_id, fromId, keepContextOnly).map(this.rowToMessage);
  }

  getMessagesForAI(sessionId: string, summaryMessageId: number | null): Message[] {
    let messages: Message[];
    if (summaryMessageId) {
      messages = this.getMessagesFrom(summaryMessageId, true);
      if (messages.length > 0 && messages[0].id === summaryMessageId) {
        messages[0] = { ...messages[0], role: 'user' };
      }
    } else {
      messages = this.getPermanentMessages(sessionId);
    }
    return messages;
  }

  deleteMessage(id: number): void {
    messageRepository.deleteById(id);
  }

  deleteMessagesBefore(sessionId: string, beforeId: number): void {
    messageRepository.deleteBefore(sessionId, beforeId);
  }

  compressSession(sessionId: string, keepCount: number): void {
    messageRepository.compressSession(sessionId, keepCount);
  }

  getSessionStats(sessionId: string): {
    totalMessages: number;
    permanentMessages: number;
    compressedCount: number;
  } {
    const total = messageRepository.countBySession(sessionId);
    const permanent = messageRepository.countPermanent(sessionId);
    return { totalMessages: total, permanentMessages: permanent, compressedCount: total - permanent };
  }

  private rowToMessage(row: MessageRow): Message {
    return {
      id: row.id,
      sessionId: row.session_id,
      role: row.role as Message['role'],
      content: row.content,
      keepContext: Boolean(row.keep_context),
      isOriginal: Boolean(row.is_original),
      createdAt: row.created_at,
    };
  }
}

export const memoryService = new MemoryService();
