import { OpenAIProvider } from '../../openai.provider.js';
import { ChatMessage } from '../../ai.types.js';
import { getOpenAITools } from '../../../tools/provider/tools.js';

export interface MemAgentConfig {
  provider: OpenAIProvider;
  maxIterations?: number;
}

const MEM_TOOLS = ['read_file', 'write_file', 'glob', 'grep'];

export class MemAgent {
  name = 'mem';
  tools = MEM_TOOLS;
  keepContext = true;

  private provider: OpenAIProvider;
  private maxIterations: number;
  private providerTools: any[] = [];
  private providerToolsMap: Map<string, any> = new Map();

  constructor(config: MemAgentConfig) {
    this.provider = config.provider;
    this.maxIterations = config.maxIterations || 3;
  }

  async run(messages: ChatMessage[]): Promise<{ id: string; name: string; content: string } | null> {
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
      sessionId: 'mem-agent',
      modelName: this.provider.getModel(),
    });

    if (!response.content) {
      return null;
    }

    try {
      const result = JSON.parse(response.content);
      if (result.id && result.name && result.content) {
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
      return `你是一个记忆提取助手。根据对话历史提取关键知识点，生成结构化的记忆文档。
      
输出格式要求（JSON）：
{
  "id": "记忆唯一ID（使用简短的中文或英文标识）",
  "name": "记忆名称（简洁明了）",
  "content": "记忆内容（Markdown格式，包含详细描述）"
}

重要规则：
- 只在有实质内容时返回记忆
- id 使用小写英文、连字符或中文
- 内容应该包含足够的上下文信息`;
    }
  }

  private buildUserPrompt(messages: ChatMessage[]): string {
    const recentMessages = messages.slice(-20);
    const filtered = recentMessages.filter(m => m.role !== 'system');
    
    const conversation = filtered
      .map(m => `${m.role === 'user' ? '用户' : '助手'}: ${m.content.substring(0, 500)}`)
      .join('\n\n');

    return `请分析以下对话历史，提取可能对后续任务有帮助的关键知识或经验：

${conversation}

如果发现有价值的信息，请按以下JSON格式返回记忆：
{
  "id": "简短ID",
  "name": "记忆名称",
  "content": "详细的记忆内容（Markdown格式）"
}

如果没有发现有价值的信息，请返回 null。`;
  }
}