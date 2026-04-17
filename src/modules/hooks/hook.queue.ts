import { HookTrigger, HookMessage, IHookHandler } from './hook.types.js';

export class HookQueue {
  private handlers: Map<HookTrigger, IHookHandler[]> = new Map();
  private messages: HookMessage[] = [];
  private waitPromise: Promise<void> | null = null;
  private resolveWait: (() => void) | null = null;

  register(handler: IHookHandler): void {
    const triggers = [handler.trigger, ...(handler.alternateTriggers || [])];
    
    for (const trigger of triggers) {
      const existing = this.handlers.get(trigger) || [];
      existing.push(handler);
      this.handlers.set(trigger, existing);
    }
  }

  getHandlers(trigger: HookTrigger): IHookHandler[] {
    return this.handlers.get(trigger) || [];
  }

  emit(trigger: HookTrigger, data: Omit<HookMessage, 'id' | 'createdAt'>): void {
    const message: HookMessage = {
      ...data,
      id: this.generateId(),
      createdAt: new Date(),
    };
    this.messages.push(message);
    
    if (this.resolveWait) {
      this.resolveWait();
      this.resolveWait = null;
      this.waitPromise = null;
    }
  }

  async wait(): Promise<HookMessage | null> {
    if (this.messages.length > 0) {
      return this.messages.shift() || null;
    }
    
    if (!this.waitPromise) {
      this.waitPromise = new Promise<void>((resolve) => {
        this.resolveWait = resolve;
      });
    }
    
    await this.waitPromise;
    return this.messages.shift() || null;
  }

  private generateId(): string {
    return `hook_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}