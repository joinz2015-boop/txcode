import { ChatMessage, BaseProvider, MultimodalContent } from '../../ai.types.js';
import { CHAT_TOOLS } from './agent_tool.js';
import { AgentToolRegistry, buildToolContext } from '../agent.tool.js';
import { getOpenAITools } from '../../../tools/provider/tools.js';
import {
  AIProvider,
  ProviderRunOptions,
  ProviderRunResult,
  ProviderStep,
  ProviderToolResult,
  ProviderTokenUsage,
} from '../../provider/base.js';
import type { MemoryService } from '../../../../services/memory/memory.service.js';
import { buildAvailableSkillsPrompt } from '../../../../services/skill/skill.tool.js';
import { loadMemory } from '../../../tools/provider/memory.js';
import { loadProjectContext } from '../../../context/project.context.js';

export interface ChatAgentConfig {
  provider: BaseProvider;
  maxIterations?: number;
  projectPath?: string;
  sessionId?: string;
  memoryService?: MemoryService;
}

export class ChatAgent implements AIProvider {
  name = 'chat';
  tools = CHAT_TOOLS;
  keepContext = true;

  private provider: BaseProvider;
  private maxIterations: number;
  private projectPath?: string;
  private sessionId?: string;
  private memoryService?: MemoryService;
  private toolRegistry: AgentToolRegistry;

  constructor(config: ChatAgentConfig) {
    this.provider = config.provider;
    this.maxIterations = config.maxIterations || 50;
    this.projectPath = config.projectPath;
    this.sessionId = config.sessionId;
    this.memoryService = config.memoryService;
    this.toolRegistry = new AgentToolRegistry(CHAT_TOOLS);
  }

  async run(
    userMessage: string,
    options?: ProviderRunOptions
  ): Promise<ProviderRunResult> {
    const builtinTools = await this.toolRegistry.getDefinitions();
    const steps: ProviderStep[] = [];
    const baseMessages: ChatMessage[] = [];
    const abortSignal = options?.abortSignal;
    const systemPrompt = await this.buildPrompt(builtinTools);

    if (options?.historyMessages && options.historyMessages.length > 0) {
      for (const msg of options.historyMessages) {
        if (msg.role !== 'system') {
          baseMessages.push(msg);
        }
      }
    }

    this.pushUserMessage(baseMessages, userMessage, options?.mediaFiles);
    this.addMessage('user', userMessage, true, true, undefined, undefined, this.sessionId, options?.mediaFiles);

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
        const toolCalls = AgentToolRegistry.parseToolCalls(response.toolCalls);

        const results: ProviderToolResult[] = [];
        const toolContext = buildToolContext({ sessionId: this.sessionId || options?.sessionId || '', projectPath: this.projectPath });

        for (const toolCall of toolCalls) {
          const result = await this.toolRegistry.execute(toolCall.name, toolCall.arguments, toolContext);
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
          const reactData = {
            type: 'assistant_with_tools',
            toolCalls: assistantMsg.toolCalls,
            thought: response.reasoning || '',
            success: result.success,
          };
          this.addMessage('assistant', JSON.stringify(reactData), true, false, undefined, undefined, options?.sessionId);

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
    return 'chat';
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

    const memory = loadMemory(workdir);
    let memoryBlock = '';
    if (memory) {
      memoryBlock = `\n<memory-context>\n${memory}\n</memory-context>`;
    }

    const projectContext = loadProjectContext(workdir);
    let projectBlock = '';
    if (projectContext) {
      projectBlock = `\n<project-context>\n${projectContext}\n</project-context>`;
    }

    const promptTemplate = `${roleTemplate}${projectBlock}${memoryBlock}

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
      return '你是一个聊天助手。';
    }
  }

  private addMessage(
    role: 'user' | 'assistant' | 'system' | 'tool',
    content: string,
    keepContext: boolean,
    isOriginal: boolean = false,
    toolCalls?: any[],
    toolCallId?: string,
    sessionId?: string,
    mediaFiles?: { filePath: string; type: string; dataUrl?: string }[]
  ): void {
    if (!sessionId || !this.memoryService) return;

    let savedContent = content;
    if (role === 'assistant' && toolCalls && toolCalls.length > 0) {
      savedContent = JSON.stringify({ type: 'assistant_with_tools', toolCalls });
    } else if (role === 'tool' && toolCallId) {
      savedContent = JSON.stringify({ type: 'tool_result', toolCallId, output: content });
    }

    this.memoryService.addMessage(sessionId, role, savedContent, keepContext, isOriginal,
      role === 'user' && mediaFiles ? mediaFiles.map(mf => ({ filePath: mf.filePath, type: mf.type })) : undefined
    );
  }

  private pushUserMessage(
    baseMessages: ChatMessage[],
    userMessage: string,
    mediaFiles?: { filePath: string; type: string; dataUrl?: string }[]
  ): void {
    if (mediaFiles && mediaFiles.length > 0) {
      const content: MultimodalContent[] = [
        { type: 'text', text: userMessage },
      ];
      for (const mf of mediaFiles) {
        content.push({
          type: 'image_url',
          image_url: { url: mf.filePath },
        });
      }
      baseMessages.push({ role: 'user', content });
    } else {
      baseMessages.push({ role: 'user', content: userMessage });
    }
  }
}