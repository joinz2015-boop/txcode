import { HookMessage } from './hook.types.js';
import { HookQueue } from './hook.queue.js';

export class HookProcessor {
  private queue: HookQueue;
  private isRunning: boolean = false;

  constructor(queue: HookQueue) {
    this.queue = queue;
  }

  async processMessage(message: HookMessage): Promise<void> {
    const handlers = this.queue.getHandlers(message.trigger);

    for (const handler of handlers) {
      try {
        await handler.handle(message);
      } catch (error) {
        console.error(`[HookProcessor] Handler error:`, error);
      }
    }
  }

  async startProcessing(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    while (this.isRunning) {
      try {
        const message = await this.queue.wait();
        if (message) {
          await this.processMessage(message);
        }
      } catch (error) {
        console.error('[HookProcessor] Processing error:', error);
      }
    }
  }

  stopProcessing(): void {
    this.isRunning = false;
  }
}