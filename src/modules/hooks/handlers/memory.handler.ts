import * as fs from 'fs';
import * as path from 'path';
import { HookMessage, HookTrigger } from '../hook.types.js';
import { HookHandler } from './hook.handler.js';
import { MemAgent } from '../../../core/ai/agents/mem/mem.agent.js';
import { getProvider } from '../../../core/ai/provider/provider.router.js';

export class MemoryHandler extends HookHandler {
  trigger: HookTrigger = 'round';
  alternateTriggers: HookTrigger[] = ['before_compact', 'chat_end'];

  async handle(message: HookMessage): Promise<void> {
    try {
      const provider = getProvider();

      const projectPath = this.getProjectPath(message);
      const memAgent = new MemAgent({ provider, workDir: projectPath });
      await memAgent.run(message.messages);
    } catch (error) {
      console.error('[MemoryHandler] Error:', error);
    }
  }
}