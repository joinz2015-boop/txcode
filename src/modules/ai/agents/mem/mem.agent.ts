import { OpenAIProvider } from '../../openai.provider.js';
import { ChatMessage } from '../../ai.types.js';
import { getProviderTools } from '../../../tools/provider/index.js';
import { MEM_TOOLS } from './agent_tool.js';
import type { Tool, ToolContext } from '../../../tools/tool.types.js';

export interface MemAgentConfig {
  provider: OpenAIProvider;
  workDir?: string;
}

export class MemAgent {
  name = 'mem';
  tools = MEM_TOOLS;
  keepContext = true;

  private provider: OpenAIProvider;
  private workDir?: string;
  private rawToolsMap: Map<string, Tool> = new Map();

  constructor(config: MemAgentConfig) {
    this.provider = config.provider;
    this.workDir = config.workDir;
  }

  async run(messages: ChatMessage[]): Promise<void> {
    const systemPrompt = await this.buildPrompt();
    const userPrompt = this.buildUserPrompt(messages);

    const baseMessages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    await this.initTools();
    await this.runLoop(baseMessages);
  }

  private async runLoop(messages: ChatMessage[]): Promise<void> {
    const maxIterations = 50;
    let iteration = 0;

    while (iteration < maxIterations) {
      iteration++;

      const response = await this.provider.chat(messages, {
        tools: this.getToolDefs(),
        sessionId: 'mem-agent',
        modelName: this.provider.getModel(),
      });

      if (!response.toolCalls || response.toolCalls.length === 0) {
        break;
      }

      const toolCalls = response.toolCalls.map((tc: any) => ({
        id: tc.id,
        name: tc.function.name,
        arguments: typeof tc.function.arguments === 'string'
          ? JSON.parse(tc.function.arguments)
          : tc.function.arguments,
      }));

      for (const toolCall of toolCalls) {
        const result = await this.executeTool(toolCall.name, toolCall.arguments);

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

  private async initTools(): Promise<void> {
    const allTools = await getProviderTools();
    for (const tool of allTools) {
      if ((MEM_TOOLS as readonly string[]).includes(tool.name)) {
        this.rawToolsMap.set(tool.name, tool);
      }
    }
  }

  private getToolDefs(): any[] {
    return Array.from(this.rawToolsMap.values()).map(tool => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }));
  }

  private async executeTool(
    name: string,
    args: Record<string, any>
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    const tool = this.rawToolsMap.get(name);
    if (!tool) {
      const available = Array.from(this.rawToolsMap.keys()).join(', ');
      return { success: false, error: `Tool not found: ${name}. Available: ${available}` };
    }

    const context: ToolContext = {
      sessionId: 'mem-agent',
      workDir: this.workDir || process.cwd(),
    };

    try {
      const result = await tool.execute(args, context);
      return { success: result.success, data: result.output, error: result.error };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  private async buildPrompt(): Promise<string> {
    const fs = await import('fs/promises');
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    return await fs.readFile(path.join(__dirname, 'prompts', 'role.txt'), 'utf-8');
  }

  private buildUserPrompt(messages: ChatMessage[]): string {
    const recentMessages = messages.slice(-20);
    const filtered = recentMessages.filter(m => m.role !== 'system');

    const conversation = filtered
      .map(m => `${m.role === 'user' ? '用户' : '助手'}: ${m.content.substring(0, 500)}`)
      .join('\n\n');

    return `请分析以下对话历史，提取可能对后续任务有帮助的关键信息：

${conversation}

如果发现有价值的信息，请直接调用 memory 工具添加记忆。
`;
  }
}