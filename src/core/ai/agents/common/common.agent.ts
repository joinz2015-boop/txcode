import { BaseProvider, ChatMessage, MultimodalContent } from '@/entity/ai.entity.js';
import { createIterationSignal } from '../../helpers/abort.helper.js';
import { buildProviderPrompt } from './prompts.js';
import { AgentToolRegistry, buildToolContext } from '../agent.tool.js';
import {
  AIProvider,
  ProviderRunOptions,
  ProviderRunResult,
  ProviderStep,
  ProviderToolResult,
  ProviderTokenUsage,
} from '../../provider/base.js';
import type { MemoryService } from '../../../../services/memory/memory.service.js';
import type { SummarizerAgent } from '../summarizer/summarizer.agent.js';
import type { SessionService } from '../../../../services/session/session.service.js';
import { specInjector } from '../../../../modules/spec/index.js';

export interface CommonAgentConfig {
  provider: BaseProvider;
  toolService: any;
  maxIterations?: number;
  projectPath?: string;
  sessionId?: string;
  memoryService?: MemoryService;
  summarizer?: SummarizerAgent;
  sessionService?: SessionService;
}

export class CommonAgent implements AIProvider {
  name = 'common';

  private provider: BaseProvider;
  private toolService: any;
  private maxIterations: number;
  private projectPath?: string;
  private sessionId?: string;
  private memoryService?: MemoryService;
  private summarizer?: SummarizerAgent;
  private sessionService?: SessionService;
  private userMessage: string = '';
  private injectedUserMessage: string = '';
  private mediaFiles?: { filePath: string; type: string; dataUrl?: string }[];
  private toolRegistry: AgentToolRegistry;

  constructor(config: CommonAgentConfig) {
    this.provider = config.provider;
    this.toolService = config.toolService;
    this.maxIterations = config.maxIterations || 50;
    this.projectPath = config.projectPath;
    this.sessionId = config.sessionId;
    this.memoryService = config.memoryService;
    this.summarizer = config.summarizer;
    this.sessionService = config.sessionService;
    this.toolRegistry = new AgentToolRegistry(null, { loadAll: true });
  }

  async run(
    userMessage: string,
    options?: ProviderRunOptions
  ): Promise<ProviderRunResult> {
    this.userMessage = userMessage;

    const steps: ProviderStep[] = [];
    const baseMessages: ChatMessage[] = [];
    const abortSignal = options?.abortSignal;

    const builtinTools = await this.toolRegistry.getDefinitions();
    const systemPrompt = await buildProviderPrompt(await this.toolRegistry.getBuiltinDefinitions(), [], this.maxIterations, {
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
      this.pushUserMessage(baseMessages, injectedMessage, options?.mediaFiles);
    } else {
      const firstUserIndex = baseMessages.findIndex(m => m.role === 'user');
      if (firstUserIndex >= 0) {
        const originalFirstUser = baseMessages[firstUserIndex].content;
        if (typeof originalFirstUser === 'string') {
          const reinjected = specInjector.injectIntoMessage(originalFirstUser, process.cwd());
          baseMessages[firstUserIndex].content = reinjected;
        } else {
          const textPart = originalFirstUser.find((c: MultimodalContent) => c.type === 'text');
          if (textPart) {
            const reinjected = specInjector.injectIntoMessage(
              (textPart as MultimodalContent & { type: 'text' }).text,
              process.cwd()
            );
            (textPart as MultimodalContent & { type: 'text' }).text = reinjected;
          }
        }
      } 
      this.pushUserMessage(baseMessages, userMessage, options?.mediaFiles);
    }

    this.mediaFiles = options?.mediaFiles;
    this.injectedUserMessage = specInjector.shouldInject(messageCount)
      ? specInjector.injectIntoMessage(userMessage, process.cwd())
      : userMessage;

    this.addMessage('user', userMessage, true, true, undefined, undefined, this.sessionId, options?.mediaFiles);

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

      const { signal: iterSignal, cleanup } = createIterationSignal(abortSignal);
      const response = await this.provider.chat(messages, { 
        tools: builtinTools, 
        abortSignal: iterSignal,
        sessionId: this.sessionId,
        modelName: this.provider.getModel(),
      }).finally(() => cleanup());

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
        const toolCalls = AgentToolRegistry.parseToolCalls(response.toolCalls);

        const results: ProviderToolResult[] = [];
        const toolContext = buildToolContext({ sessionId: this.sessionId || '', projectPath: this.projectPath });

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
    return 'common';
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
        this.pushUserMessage(baseMessages, this.injectedUserMessage, this.mediaFiles);
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
