import { configService as defaultConfigService } from '../../services/config/config.service.js';
import { sessionService as defaultSessionService } from '../../services/session/session.service.js';
import { memoryService } from '../../services/memory/index.js';
import { messageFileRepository } from '../../repository/message_file.repository.js';
import { ChatInput, ChatOptions, ChatResult, Step } from './codeChat.types.js';
import type { Session } from '../../entity/session.entity.js';
import { ConfigService } from '../../services/config/config.service.js';
import { getProvider } from '../../core/ai/provider/provider.router.js';
import { CodeAgent } from '../../core/ai/agents/index.js';
import { SummarizerAgent } from '../../core/ai/agents/summarizer/summarizer.agent.js';
import { ChatMessage } from '../../core/ai/ai.types.js';

export class CodeChatService {
  private configService: ConfigService;
  private sessionService: typeof defaultSessionService;

  constructor(config?: { configService?: ConfigService; sessionService?: typeof defaultSessionService }) {
    this.configService = config?.configService || defaultConfigService;
    this.sessionService = config?.sessionService || defaultSessionService;
  }

  async handleChat(input: ChatInput): Promise<ChatResult> {
    const session = this.getOrCreateSession(input);

    return this.chatWithAI(input.message, {
      sessionId: session.id,
      projectPath: session.projectPath ?? undefined,
      enableDevLog: input.enableDevLog,
      abortSignal: input.abortSignal,
      modelName: input.modelName,
      mediaFiles: input.mediaFiles,
      onStep: input.onStep,
      onCompact: input.onCompact,
    });
  }

  private getOrCreateSession(input: ChatInput): Session {
    let session = input.sessionId ? this.sessionService.get(input.sessionId) : null;
    if (!session) {
      session = this.sessionService.create('New Chat', input.projectPath || undefined);
    }
    this.sessionService.switchTo(session.id);
    return session;
  }

  private async chatWithAI(message: string, options: ChatOptions): Promise<ChatResult> {
    const reactSteps: any[] = [];
    const sessionId = options.sessionId;

    const provider = getProvider(options.modelName);

    const summarizer = new SummarizerAgent(
      this.sessionService,
      memoryService,
      this.configService
    );

    let historyMessages: ChatMessage[] = [];
    if (sessionId) {
      const session = this.sessionService.get(sessionId);
      const summaryMessageId = session?.summaryMessageId || null;
      const msgs = memoryService.getMessagesForAI(sessionId, summaryMessageId);

      const fileRows = messageFileRepository.getBySessionId(sessionId);
      const filesByMsg: Map<number, { filePath: string; type: string }[]> = new Map();
      for (const row of fileRows) {
        if (!filesByMsg.has(row.message_id)) {
          filesByMsg.set(row.message_id, []);
        }
        filesByMsg.get(row.message_id)!.push({ filePath: row.file_path, type: row.file_type });
      }

      historyMessages = msgs.map(m => {
        const msgFiles = filesByMsg.get(m.id);
        if (m.role === 'user' && msgFiles && msgFiles.length > 0) {
          const content: any[] = [
            { type: 'text', text: m.content },
            ...msgFiles.map(mf => ({ type: 'image_url', image_url: { url: mf.filePath } })),
          ];
          return { role: 'user' as const, content };
        }

        const chatMsg: ChatMessage = {
          role: m.role as 'user' | 'assistant' | 'system' | 'tool',
          content: m.content,
        };

        try {
          const parsed = JSON.parse(m.content);
          if (parsed.type === 'assistant_with_tools' && parsed.toolCalls) {
            chatMsg.content = '';
            chatMsg.toolCalls = parsed.toolCalls;
            if (parsed.thought) {
              (chatMsg as any).reasoning = parsed.thought;
            }
          } else if (parsed.type === 'tool_result') {
            chatMsg.content = parsed.output || '';
            chatMsg.toolCallId = parsed.toolCallId;
          } else if (parsed.thought) {
            (chatMsg as any).reasoning = parsed.thought;
          }
        } catch { }

        return chatMsg;
      });
    }

    const agent = new CodeAgent({
      provider,
      maxIterations: 50,
      projectPath: options.projectPath,
      sessionId,
      memoryService,
      summarizer,
      sessionService: this.sessionService,
    });

    const abortController = new AbortController();
    const abortHandler = () => abortController.abort();
    if (options.abortSignal) {
      options.abortSignal.addEventListener('abort', abortHandler);
    }

    try {
      let userMessage = message;
      if (options.enableDevLog) {
        const date = new Date().toISOString().slice(0, 10);
        const sessionIdSuffix = sessionId.slice(-12);
        userMessage = message + `\n\n开发过程中你需要在 devlog.md 文件中记录你的修改记录，文件路径为：.txcode/session/${date}/${sessionIdSuffix}/devlog.md`;
      }
      const result = await agent.run(userMessage, {
        abortSignal: abortController.signal,
        onStep: (step: any, iteration: number, usage?: any) => {
          const toolCalls = (step.toolCalls || []).map((tc: any) => ({
            id: tc.id,
            type: 'function',
            function: {
              name: tc.name,
              arguments: typeof tc.arguments === 'string' ? tc.arguments : JSON.stringify(tc.arguments),
            },
          }));
          const reactFormatStep: Step = {
            thought: step.reasoning || '',
            toolCalls,
            success: step.results?.[0]?.success ?? true,
          };
          reactSteps.push({ iteration, ...reactFormatStep });
          options.onStep?.(reactFormatStep, iteration, usage);
        },
        onCompact: options.onCompact,
        historyMessages,
        sessionId,
        mediaFiles: options.mediaFiles,
      });

      if (sessionId && result.usage) {
        this.sessionService.updateTokenUsage(
          sessionId,
          result.usage.promptTokens,
          result.usage.completionTokens
        );
      }

      return {
        answer: result.answer || '',
        iterations: result.iterations || 0,
        success: result.success,
        usage: result.usage,
        reactSteps,
        sessionId: options.sessionId,
      };
    } finally {
      if (options.abortSignal) {
        options.abortSignal.removeEventListener('abort', abortHandler);
      }
    }
  }
}
