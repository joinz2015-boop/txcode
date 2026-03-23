import { ConfigService, configService as defaultConfigService } from '../config/config.service.js';
import { OpenAIProvider } from './openai.provider.js';
import { ReActAgent } from './react.agent.js';
import { ChatMessage, ChatOptions, ChatResponse, ReActState } from './ai.types.js';
import { ToolService, toolService as defaultToolService } from '../tools/tool.service.js';
import { MemoryService } from '../memory/memory.service.js';
import { ContextService } from '../context/context.service.js';
import { SessionService, sessionService as defaultSessionService } from '../session/session.service.js';
import { SkillsManager } from '../skill/skills.manager.js';
import { ReActResult } from './react/react.types.js';
import { SummarizerService } from './summarizer/index.js';
import txConfig from '../../config/tx.config.js';

export interface AIServiceConfig {
  configService?: ConfigService;
  toolService?: ToolService;
  skillsManager?: SkillsManager;
  maxToolIterations?: number;
}

export class AIService {
  private configService: ConfigService;
  private toolService: ToolService;
  private sessionService: SessionService;
  private skillsManager?: SkillsManager;
  private provider: OpenAIProvider | null = null;
  private maxToolIterations: number;

  constructor(config?: AIServiceConfig) {
    this.configService = config?.configService || defaultConfigService;
    this.toolService = config?.toolService || defaultToolService;
    this.sessionService = defaultSessionService;
    this.skillsManager = config?.skillsManager;
    this.maxToolIterations = config?.maxToolIterations || txConfig.maxToolIterations;
  }

  private getProvider(): OpenAIProvider {
    if (!this.provider) {
      const providerConfig = this.configService.getDefaultProvider();
      if (!providerConfig) {
        throw new Error('No default AI provider configured');
      }

      const models = this.configService.getModels(providerConfig.id);
      const defaultModel = models.find(m => m.enabled) || { name: 'gpt-4' };

      this.provider = new OpenAIProvider({
        apiKey: providerConfig.apiKey,
        baseUrl: providerConfig.baseUrl,
        defaultModel: defaultModel.name,
      });
    }
    return this.provider;
  }

  async chat(
    messages: ChatMessage[],
    options: ChatOptions = {}
  ): Promise<ChatResponse> {
    const provider = this.getProvider();
    return provider.chat(messages, options);
  }

  async chatWithReAct(
    userMessage: string,
    options?: {
      sessionId?: string;
      projectPath?: string;
      memoryService?: MemoryService;
      contextService?: ContextService;
      onStep?: (step: any, iteration: number) => void;
    }
  ): Promise<ReActResult> {
    const provider = this.getProvider();
    const sessionId = options?.sessionId;

    let historyMessages: ChatMessage[] = [];
    if (sessionId && options?.memoryService) {
      const session = this.sessionService.get(sessionId);
      const summaryMessageId = session?.summaryMessageId || null;
      const msgs = options.memoryService.getMessagesForAI(sessionId, summaryMessageId);
      historyMessages = msgs.map(m => ({
        role: m.role as 'user' | 'assistant' | 'system' | 'tool',
        content: m.content,
      }));
    }

    const agent = new ReActAgent({
      provider,
      toolService: this.toolService,
      skillsManager: this.skillsManager,
      memoryService: options?.memoryService,
      maxIterations: this.maxToolIterations,
      projectPath: options?.projectPath,
      sessionId,
    });

    const result = await agent.run(userMessage, {
      onStep: options?.onStep,
      historyMessages,
    });

    if (sessionId && result.usage) {
      this.sessionService.updateTokenUsage(
        sessionId,
        result.usage.promptTokens,
        result.usage.completionTokens
      );

      const summarizer = new SummarizerService(
        this.sessionService,
        options?.memoryService || new MemoryService(),
        this.configService
      );
      const check = summarizer.checkNeedsCompact(sessionId);
      if (check.needed) {
        console.log(`[AutoCompact] ${check.reason}, triggering compaction...`);
        await summarizer.compact({ sessionId });
      }
    }

    return result;
  }

  async *chatStream(
    messages: ChatMessage[],
    options: ChatOptions = {}
  ): AsyncGenerator<string, void, unknown> {
    const provider = this.getProvider();
    yield* provider.chatStream(messages, options);
  }

  setApiKey(apiKey: string): void {
    this.provider = new OpenAIProvider({ apiKey });
  }

  setBaseUrl(baseUrl: string): void {
    const providerConfig = this.configService.getDefaultProvider();
    this.provider = new OpenAIProvider({
      apiKey: providerConfig?.apiKey || '',
      baseUrl,
    });
  }

  resetProvider(): void {
    this.provider = null;
  }
}

export const aiService = new AIService();
