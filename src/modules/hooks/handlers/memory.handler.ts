import * as fs from 'fs';
import * as path from 'path';
import { HookMessage, HookTrigger } from '../hook.types.js';
import { HookHandler } from './hook.handler.js';
import { MemAgent } from '../../ai/agents/mem/mem.agent.js';
import { configService } from '../../config/index.js';
import { OpenAIProvider } from '../../ai/openai.provider.js';

export class MemoryHandler extends HookHandler {
  trigger: HookTrigger = 'round';
  alternateTriggers: HookTrigger[] = ['before_compact', 'chat_end'];

  async handle(message: HookMessage): Promise<void> {
    try {
      const providerConfig = configService.getDefaultProvider();
      if (!providerConfig) {
        return;
      }

      const provider = new OpenAIProvider({
        apiKey: providerConfig.apiKey,
        baseUrl: providerConfig.baseUrl,
        defaultModel: configService.getDefaultModel(),
      });

      const projectPath = this.getProjectPath(message);
      const memAgent = new MemAgent({ provider, workDir: projectPath });
      await memAgent.run(message.messages);
    } catch (error) {
      console.error('[MemoryHandler] Error:', error);
    }
  }
}