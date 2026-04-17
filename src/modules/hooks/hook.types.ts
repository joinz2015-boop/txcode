import { ChatMessage } from '../ai/ai.types.js';

export type HookTrigger = 'round' | 'before_compact' | 'chat_end';

export interface HookMessage {
  id: string;
  trigger: HookTrigger;
  messages: ChatMessage[];
  metadata: {
    sessionId: string;
    projectPath: string;
    roundCount?: number;
  };
  createdAt: Date;
}

export interface IHookHandler {
  trigger: HookTrigger;
  alternateTriggers?: HookTrigger[];
  handle(message: HookMessage): Promise<void>;
}