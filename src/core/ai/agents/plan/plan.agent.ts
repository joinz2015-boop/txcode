import { ChatMessage, BaseProvider, MultimodalContent } from '../../ai.types.js';
import { createIterationSignal } from '../../helpers/abort.helper.js';
import { PLAN_TOOLS } from './agent_tool.js';
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
import { buildAvailableSkillsPrompt } from '../../../../services/skill/skill.tool.js';
import type { SummarizerAgent } from '../summarizer/summarizer.agent.js';
import type { SessionService } from '../../../../services/session/session.service.js';
import { RewriteUserMessage } from './rewrite_user_message.js';
import { hooks } from '../../../../modules/hooks/index.js';
import { loadMemory } from '../../../tools/provider/memory.js';
import { loadProjectContext } from '../../../context/project.context.js';

async function loadRoleTemplate(): Promise<string> {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    return await fs.readFile(path.join(__dirname, 'prompts', 'role.txt'), 'utf-8');
  } catch {
    return '你是 txcode 的 AI 方案助手，专门帮助用户完成方案文档编写任务。';
  }
}

async function buildPlanPrompt(
  maxIterations: number,
  options?: { platform?: string; workdir?: string; planFilePath?: string }
): Promise<string> {
  const platform = options?.platform || process.platform;

  const workdir = options?.workdir || process.cwd();

  const skillsPrompt = await buildAvailableSkillsPrompt();
  const roleTemplate = await loadRoleTemplate();

  const memory = loadMemory(workdir);
  let memoryBlock = '';
  if (memory) {
    memoryBlock = `\n<memory-context>\n${memory}\n</memory-context>`;
  }

  const planFileReplacement = options?.planFilePath || '';

  return `${roleTemplate}${memoryBlock}

 ## 可用 Skills
 {skills}
 **注意**
  读取skill 可以通过read_file工具读取内容
 `.replace('{platform}', platform)
    .replace('{workdir}', workdir)
    .replace('{plan_file}', planFileReplacement)
    .replace('{skills}', skillsPrompt);
}

export interface PlanAgentConfig {
  provider: BaseProvider;
  maxIterations?: number;
  projectPath?: string;
  sessionId?: string;
  memoryService?: MemoryService;
  summarizer?: SummarizerAgent;
  sessionService?: SessionService;
  planFilePath?: string;
}

export class PlanAgent implements AIProvider {
  name = 'plan';
  tools = PLAN_TOOLS;
  keepContext = true;

  private provider: BaseProvider;
  private maxIterations: number;
  private projectPath?: string;
  private sessionId?: string;
  private memoryService?: MemoryService;
  private summarizer?: SummarizerAgent;
  private sessionService?: SessionService;
  private planFilePath?: string;
  private userMessage: string = '';
  private injectedUserMessage: string = '';
  private mediaFiles?: { filePath: string; type: string; dataUrl?: string }[];
  private toolRegistry: AgentToolRegistry;
  private roundCount: number = 0;

  constructor(config: PlanAgentConfig) {
    this.provider = config.provider;
    this.maxIterations = config.maxIterations || 50;
    this.projectPath = config.projectPath;
    this.sessionId = config.sessionId;
    this.memoryService = config.memoryService;
    this.summarizer = config.summarizer;
    this.sessionService = config.sessionService;
    this.planFilePath = config.planFilePath;
    this.toolRegistry = new AgentToolRegistry(PLAN_TOOLS, { verboseError: true });
  }

  async run(
    userMessage: string,
    options?: ProviderRunOptions
  ): Promise<ProviderRunResult> {
    this.userMessage = userMessage;
    const builtinTools = await this.toolRegistry.getDefinitions();

    const steps: ProviderStep[] = [];
    const baseMessages: ChatMessage[] = [];
    const abortSignal = options?.abortSignal;

    const systemPrompt = await buildPlanPrompt(this.maxIterations, {
      workdir: this.projectPath,
      planFilePath: this.planFilePath,
    });

    if (options?.historyMessages && options.historyMessages.length > 0) {
      for (const msg of options.historyMessages) {
        if (msg.role !== 'system') {
          baseMessages.push(msg);
        }
      }
    }

    const messageCount = options?.historyMessages?.length || 0;
    const rewriter = new RewriteUserMessage(this.projectPath || '', this.planFilePath, messageCount);

    rewriter.prepare(baseMessages, userMessage, options?.mediaFiles,
      (msg, mf) => this.pushUserMessage(baseMessages, msg, mf)
    );

    this.mediaFiles = options?.mediaFiles;
    this.injectedUserMessage = rewriter.injectedMessage;

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

      const { signal: iterSignal, cleanup } = createIterationSignal(abortSignal);
      const response = await this.provider.chat(messages, {
        tools: builtinTools,
        abortSignal: iterSignal,
        sessionId: this.sessionId,
        modelName: this.provider.getModel(),
      }).finally(() => cleanup());

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
        this.addMessage('assistant', finalAnswer, true, false, undefined, undefined, this.sessionId);
        break;
      }

      if (response.finishReason === 'tool_calls' && response.toolCalls && response.toolCalls.length > 0) {
        const toolCalls = AgentToolRegistry.parseToolCalls(response.toolCalls);

        const results: ProviderToolResult[] = [];
        const toolContext = buildToolContext({ sessionId: this.sessionId || '', projectPath: this.projectPath });

        for (const toolCall of toolCalls) {
          let timer: ReturnType<typeof setTimeout> | null = setTimeout(() => {
            options?.onStep?.({
              reasoning: response.reasoning,
              toolCalls: toolCalls.map(tc => ({ ...tc, status: 'executing' as const })),
              results: [],
            }, iteration);
            timer = null;
          }, 1000);

          const result = await this.toolRegistry.execute(toolCall.name, toolCall.arguments, toolContext);

          if (timer) clearTimeout(timer);

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
            reasoning: response.reasoning || '',
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
          this.addMessage('assistant', JSON.stringify(reactData), true, false, undefined, undefined, this.sessionId);

          const toolMsg = {
            role: 'tool' as const,
            content: result.success ? result.output || '' : `Error: ${result.error}`,
            toolCallId: toolCall.id,
          };
          baseMessages.push(toolMsg);
          this.addMessage('tool', toolMsg.content, true, false, undefined, toolCall.id, this.sessionId);
        }

        await this.checkAndCompact(options, baseMessages, totalUsage, newMessagesStartIndex);
        this.checkHooks('round');
        continue;
      }

      if (response.content) {
        finalAnswer = response.content;
        break;
      }

      break;
    }

    const success = iteration < this.maxIterations && finalAnswer.length > 0;

    this.checkHooks('end');

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
    return 'plan';
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

    this.checkHooks('compact');

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

  private checkHooks(type: 'round' | 'compact' | 'end'): void {
    const baseMessage = {
      messages: this.memoryService?.getAllMessages(this.sessionId || '') || [],
      metadata: {
        sessionId: this.sessionId || '',
        projectPath: this.projectPath || process.cwd(),
        agentName: this.name,
      }
    };

    if (type === 'compact') {
      this.roundCount = 0;
      hooks.queue.emit('before_compact', {
        ...baseMessage,
        trigger: 'before_compact'
      });
    } else if (type === 'round') {
      this.roundCount++;
      if (this.roundCount >= 10) {
        hooks.queue.emit('round', {
          ...baseMessage,
          trigger: 'round',
          metadata: { ...baseMessage.metadata, roundCount: this.roundCount }
        });
        this.roundCount = 0;
      }
    } else if (type === 'end') {
      hooks.queue.emit('chat_end', {
        ...baseMessage,
        trigger: 'chat_end'
      });
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
        { type: 'text', text: userMessage }
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
