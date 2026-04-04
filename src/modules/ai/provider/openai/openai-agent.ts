import { OpenAIProvider } from '../../openai.provider.js';
import { ChatMessage } from '../../ai.types.js';
import { buildProviderPrompt } from './prompts.js';
import { getOpenAITools, openaiTools } from '../../../tools/provider/tools.js';
import { getProviderTools } from '../../../tools/provider/index.js';
import {
  AIProvider,
  ProviderRunOptions,
  ProviderRunResult,
  ProviderStep,
  ProviderToolCall,
  ProviderToolResult,
  ProviderTokenUsage,
} from '../base.js';
import type { MemoryService } from '../../../memory/memory.service.js';
import type { SummarizerService } from '../../../ai/summarizer/index.js';
import type { SessionService } from '../../../session/session.service.js';
import { specInjector } from '../../../spec/index.js';

export interface OpenAIAgentConfig {
  provider: OpenAIProvider;
  toolService: any;
  maxIterations?: number;
  projectPath?: string;
  sessionId?: string;
  memoryService?: MemoryService;
  summarizer?: SummarizerService;
  sessionService?: SessionService;
}

export class OpenAIAgent implements AIProvider {
  name = 'openai';

  private provider: OpenAIProvider;
  private toolService: any;
  private maxIterations: number;
  private projectPath?: string;
  private sessionId?: string;
  private memoryService?: MemoryService;
  private summarizer?: SummarizerService;
  private sessionService?: SessionService;
  private userMessage: string = '';
  private providerTools: any[] = [];
  private providerToolsMap: Map<string, any> = new Map();

  constructor(config: OpenAIAgentConfig) {
    this.provider = config.provider;
    this.toolService = config.toolService;
    this.maxIterations = config.maxIterations || 50;
    this.projectPath = config.projectPath;
    this.sessionId = config.sessionId;
    this.memoryService = config.memoryService;
    this.summarizer = config.summarizer;
    this.sessionService = config.sessionService;
  }

  async run(
    userMessage: string,
    options?: ProviderRunOptions
  ): Promise<ProviderRunResult> {
    this.userMessage = userMessage;
    this.providerTools = await getProviderTools();
    this.providerToolsMap.clear();
    for (const t of this.providerTools) {
      this.providerToolsMap.set(t.name, t);
    }

    const steps: ProviderStep[] = [];
    const baseMessages: ChatMessage[] = [];
    const abortSignal = options?.abortSignal;

    const builtinTools = await this.getBuiltinTools();
    const systemPrompt = await buildProviderPrompt(await this.getBuiltinTools(), [], this.maxIterations, {
      workdir: this.projectPath || process.cwd(),
    });

    if (options?.historyMessages && options.historyMessages.length > 0) {
      for (const msg of options.historyMessages) {
        if (msg.role !== 'system') {
          baseMessages.push(msg);
        }
      }
    }

    const messageCount = options?.historyMessages?.length || 0;

    if (specInjector.shouldInject(messageCount)) {
      const injectedMessage = specInjector.injectIntoMessage(userMessage, process.cwd());
      baseMessages.push({ role: 'user', content: injectedMessage });
    } else {
      const firstUserIndex = baseMessages.findIndex(m => m.role === 'user');
      if (firstUserIndex >= 0) {
        const originalFirstUser = baseMessages[firstUserIndex].content;
        const reinjected = specInjector.injectIntoMessage(originalFirstUser, process.cwd());
        baseMessages[firstUserIndex].content = reinjected;
      } 
      baseMessages.push({ role: 'user', content: userMessage });
    }

    this.addMessage('user', userMessage, true, true, undefined, undefined, this.sessionId);

    let iteration = 0;
    let finalAnswer = '';
    let totalUsage: ProviderTokenUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

    while (iteration < this.maxIterations) {
      // 检查取消信号
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

      // 检查取消信号
      if (abortSignal?.aborted) {
        throw new Error('ABORTED');
      }

      if (response.usage) {
        totalUsage.promptTokens = response.usage.promptTokens;
        totalUsage.completionTokens = response.usage.completionTokens;
        totalUsage.totalTokens = response.usage.totalTokens;
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

        const newMessagesStartIndex = baseMessages.length;
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

        await this.checkAndCompact(options, baseMessages, totalUsage, newMessagesStartIndex);
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
    return 'openai';
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
      this.providerTools = await getProviderTools();
      this.providerToolsMap.clear();
      for (const t of this.providerTools) {
        this.providerToolsMap.set(t.name, t);
      }
    }
    return await getOpenAITools();
  }

  private async checkAndCompact(
    options: ProviderRunOptions | undefined,
    baseMessages: ChatMessage[],
    totalUsage: ProviderTokenUsage,
    newMessagesStartIndex: number
  ): Promise<void> {
    if (!this.sessionId || !this.summarizer) return;

    const check = this.summarizer.checkNeedsCompact(
      this.sessionId,
      totalUsage.promptTokens
    );

    if (!check.needed) return;

    const currentToolResults = baseMessages.slice(newMessagesStartIndex).filter(
      msg => msg.role === 'tool' || (msg.role === 'assistant' && msg.toolCalls)
    );

    try {
      const result = await this.summarizer.compact({
        sessionId: this.sessionId,
      });

      if (result.success) {
        options?.onCompact?.({
          beforeTokens: check.promptTokens,
          afterTokens: result.tokensAfter,
          summary: result.summary,
        });

        const session = this.sessionService?.get(this.sessionId);
        
        const summaryMessages = this.memoryService?.getMessagesForAI(
          this.sessionId,
          session?.summaryMessageId || null
        ) || [];

        baseMessages.length = 0;
        baseMessages.push({ role: 'user', content: this.userMessage });
        if (summaryMessages.length > 0) {
          baseMessages.push(...summaryMessages.filter(m => m.role !== 'system'));
        }
        baseMessages.push(...currentToolResults);
      }
    } catch (error) {
      console.error('[AutoCompact] Error:', error);
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
