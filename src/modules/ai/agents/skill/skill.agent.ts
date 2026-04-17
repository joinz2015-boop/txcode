import { OpenAIProvider } from '../../openai.provider.js';
import { ChatMessage } from '../../ai.types.js';
import { getOpenAITools } from '../../../tools/provider/tools.js';

export interface SkillAgentConfig {
  provider: OpenAIProvider;
  maxIterations?: number;
}

const SKILL_TOOLS = ['read_file', 'write_file', 'glob', 'grep'];

export class SkillAgent {
  name = 'skill';
  tools = SKILL_TOOLS;
  keepContext = true;

  private provider: OpenAIProvider;
  private maxIterations: number;
  private providerTools: any[] = [];
  private providerToolsMap: Map<string, any> = new Map();

  constructor(config: SkillAgentConfig) {
    this.provider = config.provider;
    this.maxIterations = config.maxIterations || 3;
  }

  async run(messages: ChatMessage[]): Promise<{ name: string; content: string } | null> {
    this.providerTools = await this.getFilteredTools();
    this.providerToolsMap.clear();
    for (const t of this.providerTools) {
      this.providerToolsMap.set(t.function.name, t);
    }

    const systemPrompt = await this.buildPrompt();
    const userPrompt = this.buildUserPrompt(messages);

    const conversation: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    const response = await this.provider.chat(conversation, {
      sessionId: 'skill-agent',
      modelName: this.provider.getModel(),
    });

    if (!response.content) {
      return null;
    }

    try {
      const result = JSON.parse(response.content);
      if (result.name && result.content) {
        return result;
      }
    } catch {
      return null;
    }

    return null;
  }

  private async getFilteredTools(): Promise<any[]> {
    const allTools = await getOpenAITools();
    const filtered = allTools.filter((tool: any) => this.tools.includes(tool.function.name));
    return filtered.map(tool => ({
      type: 'function' as const,
      function: {
        name: tool.function.name,
        description: tool.function.description,
        parameters: tool.function.parameters,
      },
    }));
  }

  private async buildPrompt(): Promise<string> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      const { fileURLToPath } = await import('url');
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      return await fs.readFile(path.join(__dirname, 'prompts', 'role.txt'), 'utf-8');
    } catch {
      return `你是一个技能提取助手。根据对话历史和任务完成经验，生成可复用的技能指南。

输出格式要求（JSON）：
{
  "name": "技能名称（符合 skill 命名规范：小写英文、中划线分隔）",
  "content": "技能内容（Markdown 格式，包含 YAML frontmatter 和详细说明）"
}

技能命名规范：
- 全部小写
- 使用中划线分隔，如：react-component, python-api-call
- 长度 2-64 字符
- 不能以中划线开头或结尾

重要规则：
- 只在有可复用的技能时返回
- 技能内容应该包含完整的指南和示例`;
    }
  }

  private buildUserPrompt(messages: ChatMessage[]): string {
    const recentMessages = messages.slice(-30);
    const filtered = recentMessages.filter(m => m.role !== 'system');
    
    const conversation = filtered
      .map(m => `${m.role === 'user' ? '用户' : '助手'}: ${m.content.substring(0, 600)}`)
      .join('\n\n');

    return `请分析以下对话历史，提取可以在未来重复使用的技能或最佳实践：

${conversation}

如果发现有可复用的技能，请按以下JSON格式返回：
{
  "name": "技能名称（如：react-component, python-api-call）",
  "content": "完整的技能内容，Markdown格式，需要包含以下部分：\n- YAML frontmatter（name, description, compatibility）\n- 技能说明\n- 使用示例\n- 约束条件"
}

如果没有发现可复用的技能，返回 null。`;
  }
}