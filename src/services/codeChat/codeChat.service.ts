import { configService as defaultConfigService } from '../../modules/config/config.service.js';
import { sessionService as defaultSessionService } from '../../modules/session/session.service.js';
import { memoryService } from '../../modules/memory/index.js';
import { ChatInput, ChatOptions, ChatResult, Step } from './codeChat.types.js';
import { Session } from '../../modules/session/session.types.js';
import { ConfigService } from '../../modules/config/config.service.js';
import { OpenAIProvider } from '../../modules/ai/openai.provider.js';
import { CodeAgent } from '../../modules/ai/agents/index.js';
import { SummarizerService } from '../../modules/ai/summarizer/index.js';

export class CodeChatService {
  private configService: ConfigService;
  private sessionService: typeof defaultSessionService;

  constructor(config?: { configService?: ConfigService; sessionService?: typeof defaultSessionService }) {
    this.configService = config?.configService || defaultConfigService;
    this.sessionService = config?.sessionService || defaultSessionService;
  }

  private getProvider(modelName?: string): OpenAIProvider {
    const defaultModel = modelName || this.configService.getDefaultModel();
    const providerConfig = this.configService.getModelProvider(defaultModel);

    if (!providerConfig) {
      throw new Error(`Provider not found for model: ${defaultModel}`);
    }

    return new OpenAIProvider({
      apiKey: providerConfig.apiKey,
      baseUrl: providerConfig.baseUrl,
      defaultModel: defaultModel,
    });
  }

  async handleChat(input: ChatInput): Promise<ChatResult> {
    const session = this.getOrCreateSession(input);

    return this.chatWithAI(input.message, {
      sessionId: session.id,
      projectPath: session.projectPath ?? undefined,
      abortSignal: input.abortSignal,
      modelName: input.modelName,
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

    const provider = this.getProvider(options.modelName);

    const summarizer = new SummarizerService(
      this.sessionService,
      memoryService,
      this.configService
    );

    const agent = new CodeAgent({
      provider,
      maxIterations: 50,
      projectPath: options.projectPath,
      sessionId: options.sessionId,
      memoryService,
      summarizer,
      sessionService: this.sessionService,
    });

    const result = await agent.run(message, {
      abortSignal: options.abortSignal,
      onStep: (step: any, iteration: number, usage?: any) => {
        const reactFormatStep: Step = {
          thought: step.reasoning || '',
          toolCalls: step.toolCalls || [],
          success: step.results?.[0]?.success ?? true,
        };
        reactSteps.push({ iteration, ...reactFormatStep });
        options.onStep?.(reactFormatStep, iteration, usage);
      },
      onCompact: options.onCompact,
    });

    return {
      answer: result.answer || '',
      iterations: result.iterations || 0,
      success: result.success,
      usage: result.usage,
      reactSteps,
      sessionId: options.sessionId,
    };
  }
}
