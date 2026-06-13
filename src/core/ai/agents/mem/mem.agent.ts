import { ChatMessage, BaseProvider } from '../../ai.types.js';
import { AgentToolRegistry, buildToolContext } from '../agent.tool.js';
import { MEM_TOOLS } from './agent_tool.js';

export interface MemAgentConfig {
  provider: BaseProvider;
  workDir?: string;
}

export class MemAgent {
  name = 'mem';
  tools = MEM_TOOLS;
  keepContext = true;

  private provider: BaseProvider;
  private workDir?: string;
  private toolRegistry: AgentToolRegistry;

  constructor(config: MemAgentConfig) {
    this.provider = config.provider;
    this.workDir = config.workDir;
    this.toolRegistry = new AgentToolRegistry(MEM_TOOLS, { verboseError: true });
  }

  async run(messages: ChatMessage[]): Promise<void> {
    const systemPrompt = await this.buildPrompt();
    const userPrompt = this.buildUserPrompt(messages);

    const baseMessages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    await this.runLoop(baseMessages);
  }

  private async runLoop(messages: ChatMessage[]): Promise<void> {
    const maxIterations = 50;
    let iteration = 0;
    const toolDefs = await this.toolRegistry.getDefinitions();
    const context = buildToolContext({ sessionId: 'mem-agent', projectPath: this.workDir });

    while (iteration < maxIterations) {
      iteration++;
      const response = await this.provider.chat(messages, {
        tools: toolDefs,
        sessionId: 'mem-agent',
        modelName: this.provider.getModel(),
      });

      if (!response.toolCalls || response.toolCalls.length === 0) {
        break;
      }

      const toolCalls = AgentToolRegistry.parseToolCalls(response.toolCalls);

      for (const toolCall of toolCalls) {
        const result = await this.toolRegistry.execute(toolCall.name, toolCall.arguments, context);

        messages.push({
          role: 'assistant',
          content: null as any,
          toolCalls: [{
            id: toolCall.id,
            type: 'function' as const,
            function: {
              name: toolCall.name,
              arguments: JSON.stringify(toolCall.arguments),
            },
          }],
        });

        messages.push({
          role: 'tool',
          content: result.success ? result.data || '' : `Error: ${result.error}`,
          toolCallId: toolCall.id,
        });
      }
    }
  }

  private async buildPrompt(): Promise<string> {
    const fsPromises = await import('fs/promises');
    const fs = await import('fs');
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const rolePrompt = await fsPromises.readFile(path.join(__dirname, 'prompts', 'role.txt'), 'utf-8');

    const workDir = this.workDir || process.cwd();
    const memoryPath = path.join(workDir, '.txcode', 'memory', 'MEMORY.md');
    let memorySection = '';

    if (fs.existsSync(memoryPath)) {
      const content = fs.readFileSync(memoryPath, 'utf-8');
      if(content.length > 0) {
      const entries = content.split('\n§\n').filter((e: string) => e.trim());
      if (entries.length > 0) {
        let memoryOutput = `Memory list (${entries.length} total):\n`;
        for (let i = 0; i < entries.length; i++) {
          const entry = entries[i].replace(/^#.*\n/, '').trim();
          memoryOutput += `\n${i + 1}. ${entry}`;
        }
        memoryOutput += `\n\nTotal characters: ${content.length}/2200`;
        memorySection = `\n\n## 当前记忆\n${memoryOutput}`;
      }
    }
    }

    return rolePrompt + memorySection;
  }

  private buildUserPrompt(messages: ChatMessage[]): string {
    const recentMessages = messages.slice(-20);
    const filtered = recentMessages.filter(m => m.role !== 'system');

    const conversation = filtered
      .map(m => {
        const contentStr = typeof m.content === 'string' ? m.content : (m.content.find(c => c.type === 'text') as any)?.text || '';
        return `${m.role === 'user' ? '用户' : '助手'}: ${contentStr.substring(0, 500)}`;
      })
      .join('\n\n');

    return `请分析以下对话历史，提取可能对后续任务有帮助的关键信息：

${conversation}

如果发现有价值的信息，请直接调用 memory 工具添加记忆。
`;
  }
}
