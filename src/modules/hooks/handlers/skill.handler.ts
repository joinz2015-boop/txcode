import * as fs from 'fs';
import * as path from 'path';
import { HookMessage, HookTrigger } from '../hook.types.js';
import { HookHandler } from './hook.handler.js';
import { SkillAgent } from '../../ai/agents/skill/skill.agent.js';
import { configService } from '../../config/index.js';
import { OpenAIProvider } from '../../ai/openai.provider.js';
import { skillsManager } from '../../skill/skills.manager.js';

export class SkillHandler extends HookHandler {
  trigger: HookTrigger = 'before_compact';
  alternateTriggers: HookTrigger[] = ['chat_end'];

  async handle(message: HookMessage): Promise<void> {
    try {
      const providerConfig = configService.getDefaultProvider();
      if (!providerConfig) {
        return;
      }

      // const provider = new OpenAIProvider({
      //   apiKey: providerConfig.apiKey,
      //   baseUrl: providerConfig.baseUrl,
      //   defaultModel: configService.getDefaultModel(),
      // });

      // const skillAgent = new SkillAgent({ provider });
      // const result = await skillAgent.run(message.messages);

      // if (result) {
      //   await this.saveSkill(result, message);
      //   await this.reloadSkills();
      // }
    } catch (error) {
      console.error('[SkillHandler] Error:', error);
    }
  }

  private async saveSkill(
    result: { name: string; content: string },
    message: HookMessage
  ): Promise<void> {
    const projectPath = this.getProjectPath(message);
    const skillDir = path.join(projectPath, '.txcode', 'skills', result.name);

    if (!fs.existsSync(skillDir)) {
      fs.mkdirSync(skillDir, { recursive: true });
    }

    const filePath = path.join(skillDir, 'SKILL.md');
    fs.writeFileSync(filePath, result.content, 'utf-8');
    console.log(`[SkillHandler] Saved skill: ${filePath}`);
  }

  private async reloadSkills(): Promise<void> {
    try {
      await skillsManager.loadAll();
      console.log('[SkillHandler] Skills reloaded');
    } catch (error) {
      console.error('[SkillHandler] Failed to reload skills:', error);
    }
  }
}