import { QueuedMessage, ProcessingSession, QueueStatus } from './gateway.types.js';

export class GatewayQueue {
  private queue: QueuedMessage[] = [];
  private processing: Map<string, ProcessingSession> = new Map();

  enqueue(msg: QueuedMessage): void {
    const existingIndex = this.queue.findIndex(m => m.userId === msg.userId);
    if (existingIndex !== -1) {
      this.queue[existingIndex] = msg;
    } else {
      this.queue.push(msg);
    }
  }

  dequeue(): QueuedMessage | null {
    if (this.queue.length === 0) {
      return null;
    }
    const msg = this.queue.shift()!;
    return msg;
  }

  isProcessing(userId: string): boolean {
    return this.processing.has(userId);
  }

  setProcessing(session: ProcessingSession): void {
    this.processing.set(session.userId, session);
  }

  clearProcessing(userId: string): void {
    this.processing.delete(userId);
  }

  getNext(userId: string): QueuedMessage | null {
    const index = this.queue.findIndex(m => m.userId === userId);
    if (index !== -1) {
      return this.queue[index];
    }
    return null;
  }

  peek(): QueuedMessage | null {
    if (this.queue.length === 0) {
      return null;
    }
    return this.queue[0];
  }

  removeUser(userId: string): void {
    this.queue = this.queue.filter(m => m.userId !== userId);
  }

  getStatus(): QueueStatus {
    return {
      queued: this.queue.length,
      processing: this.processing.size,
    };
  }

  clear(): void {
    this.queue = [];
    this.processing.clear();
  }
}

export const gatewayQueue = new GatewayQueue();
