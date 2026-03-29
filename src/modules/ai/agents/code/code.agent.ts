import { OpenAIProvider } from '../../openai.provider.js';
import { ChatMessage } from '../../ai.types.js';
import { CODE_TOOLS } from './agent_tool.js';
import { getOpenAITools } from '../../../tools/provider/tools.js';
import { getProviderTools } from '../../../tools/provider/index.js';
import {
  AIProvider,
  ProviderRunOptions,
  ProviderRunResult,
  ProviderStep,
  ProviderToolCall,
  ProviderToolResult,
  ProviderTokenUsage,
} from '../../provider/base.js';
import type { MemoryService } from '../../../memory/memory.service.js';
import { buildAvailableSkillsPrompt } from '../../../skill/skill.tool.js';

export interface CodeAgentConfig {
  provider: OpenAIProvider;
  maxIterations?: number;
  projectPath?: string;
  sessionId?: string;
  memoryService?: MemoryService;
}

export class CodeAgent implements AIProvider {
  name = 'code';
  tools = CODE_TOOLS;
  keepContext = true;

  private provider: OpenAIProvider;
  private maxIterations: number;
  private projectPath?: string;
  private sessionId?: string;
  private memoryService?: MemoryService;
  private providerTools: any[] = [];
  private providerToolsMap: Map<string, any> = new Map();

  constructor(config: CodeAgentConfig) {
    this.provider = config.provider;
    this.maxIterations = config.maxIterations || 50;
    this.projectPath = config.projectPath;
    this.sessionId = config.sessionId;
    this.memoryService = config.memoryService;
  }

  async run(
    userMessage: string,
    options?: ProviderRunOptions
  ): Promise<ProviderRunResult> {
    this.providerTools = await this.getFilteredTools();
    this.providerToolsMap.clear();
    for (const t of this.providerTools) {
      this.providerToolsMap.set(t.name, t);
    }

    const steps: ProviderStep[] = [];
    const baseMessages: ChatMessage[] = [];
    const abortSignal = options?.abortSignal;

    const builtinTools = await this.getBuiltinTools();
    const systemPrompt = await this.buildPrompt(await this.getBuiltinTools());

    if (options?.historyMessages && options.historyMessages.length > 0) {
      for (const msg of options.historyMessages) {
        if (msg.role !== 'system') {
          baseMessages.push(msg);
        }
      }
    }

    baseMessages.push({ role: 'user', content: userMessage });
    this.addMessage('user', userMessage, true, true, undefined, undefined, this.sessionId);

    let iteration = 0;
    let finalAnswer = '';
    let totalUsage: ProviderTokenUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

    while (iteration < this.maxIterations) {
      if (abortSignal?.aborted) {
        throw new Error('ABORTED');
      }

      iteration++;

      const messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        ...baseMessages,
      ];

      const response = await this.provider.chat(messages, {
        tools: builtinTools,
        abortSignal,
        sessionId: this.sessionId,
        modelName: this.provider.getModel(),
      });

      if (abortSignal?.aborted) {
        throw new Error('ABORTED');
      }

      if (response.usage) {
        totalUsage.promptTokens += response.usage.promptTokens;
        totalUsage.completionTokens += response.usage.completionTokens;
        totalUsage.totalTokens += response.usage.totalTokens;
      }

      if (response.finishReason === 'stop' && response.content) {
        finalAnswer = response.content;
        this.addMessage('assistant', finalAnswer, true, false, undefined, undefined, options?.sessionId);
        break;
      }

      if (response.finishReason === 'tool_calls' && response.toolCalls && response.toolCalls.length > 0) {
        const toolCalls: ProviderToolCall[] = response.toolCalls.map((tc: any) => ({
          id: tc.id,
          name: tc.function.name,
          arguments: typeof tc.function.arguments === 'string'
            ? JSON.parse(tc.function.arguments)
            : tc.function.arguments,
        }));

        const results: ProviderToolResult[] = [];

        for (const toolCall of toolCalls) {
          const result = await this.executeTool(toolCall.name, toolCall.arguments);
          results.push({
            name: toolCall.name,
            success: result.success,
            output: result.data,
            error: result.error,
          });
        }

        const step: ProviderStep = {
          reasoning: response.reasoning,
          toolCalls,
          results,
        };

        steps.push(step);
        options?.onStep?.(step, iteration, response.usage);

        for (let i = 0; i < toolCalls.length; i++) {
          const toolCall = toolCalls[i];
          const result = results[i];

          const assistantMsg = {
            role: 'assistant' as const,
            content: null as any,
            toolCalls: [{
              id: toolCall.id,
              type: 'function' as const,
              function: {
                name: toolCall.name,
                arguments: JSON.stringify(toolCall.arguments),
              },
            }],
          };
          baseMessages.push(assistantMsg);
          this.addMessage('assistant', '', true, false, assistantMsg.toolCalls, undefined, options?.sessionId);

          const toolMsg = {
            role: 'tool' as const,
            content: result.success ? result.output || '' : `Error: ${result.error}`,
            toolCallId: toolCall.id,
          };
          baseMessages.push(toolMsg);
          this.addMessage('tool', toolMsg.content, true, false, undefined, toolCall.id, options?.sessionId);
        }

        continue;
      }

      if (response.content) {
        finalAnswer = response.content;
        break;
      }

      break;
    }

    const success = iteration < this.maxIterations && finalAnswer.length > 0;

    return {
      answer: finalAnswer || steps[steps.length - 1]?.results?.[0]?.output || 'Unable to complete task',
      steps,
      iterations: iteration,
      success,
      error: iteration >= this.maxIterations ? 'Max iterations reached' : undefined,
      usage: totalUsage,
    };
  }

  getType(): string {
    return 'code';
  }

  private async executeTool(
    name: string,
    args: Record<string, any>
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const tool = this.providerToolsMap.get(name);
      if (!tool) {
        throw new Error(`Tool not found: ${name}`);
      }
      const context = {
        sessionId: this.sessionId || '',
        workDir: this.projectPath || process.cwd(),
      };
      const result = await tool.execute(args, context);
      return { success: result.success, data: result.output, error: result.error };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async getBuiltinTools(): Promise<any[]> {
    if (this.providerTools.length === 0) {
      this.providerTools = await this.getFilteredTools();
      this.providerToolsMap.clear();
      for (const t of this.providerTools) {
        this.providerToolsMap.set(t.name, t);
      }
    }
    return await getOpenAITools();
  }

  private async getFilteredTools(): Promise<any[]> {
    const allTools = await getProviderTools();
    return allTools.filter((tool: any) => this.tools.includes(tool.name));
  }

  private async buildPrompt(_builtinTools: any[] = []): Promise<string> {
    const platform = process.platform;
    const workdir = this.projectPath || process.cwd();

    const platformName = platform === 'win32' ? 'Windows'
      : platform === 'darwin' ? 'macOS'
      : platform === 'linux' ? 'Linux'
      : platform;

    const roleTemplate = await this.loadRoleTemplate();
    const skillsPrompt = await buildAvailableSkillsPrompt();

    const promptTemplate = `${roleTemplate}

  你通过 OpenAI Function Calling 模式工作：

  1. AI 生成结构化的工具调用请求
  2. 系统自动执行工具并返回结果
  3. 重复直到任务完成

  ## 上下文管理

  Provider 模式下，所有工具执行结果默认都会保留在对话历史中供后续参考。

  ## 内置工具

  {builtinTools}

  ## 可用 Skills

  {skills}

  ## 重要规则

  - 优先使用内置工具
  - 在执行任务前，先使用 skill 加载相关 Skill 指南了解约束和最佳实践
  - 如果工具执行失败，思考原因并尝试其他方法
  - 最大迭代次数: {maxIterations}

  ## 运行环境
  - 操作系统: {platform}
  - 工作目录: {workdir}
  `;

    const openaiTools = await getOpenAITools();
    const builtinToolsDesc = openaiTools.map(t => `- **${t.function.name}**: ${t.function.description}`).join('\n');

    return promptTemplate
      .replace('{platform}', platformName)
      .replace('{workdir}', workdir)
      .replace('{builtinTools}', builtinToolsDesc || '（无）')
      .replace('{skills}', skillsPrompt)
      .replace('{maxIterations}', String(this.maxIterations));
  }

  private async loadRoleTemplate(): Promise<string> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      const { fileURLToPath } = await import('url');
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      return await fs.readFile(path.join(__dirname, 'prompts', 'role.txt'), 'utf-8');
    } catch {
      return '你是 txcode，一个帮助用户完成软件工程任务的交互式命令行工具。';
    }
  }

  private addMessage(
    role: 'user' | 'assistant' | 'system' | 'tool',
    content: string,
    keepContext: boolean,
    isOriginal: boolean = false,
    toolCalls?: any[],
    toolCallId?: string,
    sessionId?: string
  ): void {
    if (!sessionId || !this.memoryService) return;

    let savedContent = content;
    if (role === 'assistant' && toolCalls && toolCalls.length > 0) {
      savedContent = JSON.stringify({ type: 'assistant_with_tools', toolCalls });
    } else if (role === 'tool' && toolCallId) {
      savedContent = JSON.stringify({ type: 'tool_result', toolCallId, output: content });
    }

    this.memoryService.addMessage(sessionId, role, savedContent, keepContext, isOriginal);
  }
}