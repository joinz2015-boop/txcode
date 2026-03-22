/**
 * AI 服务
 * 
 * 职责：
 * - 管理 AI Provider
 * - 提供 ReAct Agent
 * - 整合记忆和上下文
 */

import { ConfigService, configService as defaultConfigService } from '../config/config.service.js';
import { OpenAIProvider } from './openai.provider.js';
import { ReActAgent } from './react.agent.js';
import { ChatMessage, ChatOptions, ChatResponse, ReActState } from './ai.types.js';
import { ToolService, toolService as defaultToolService } from '../tools/tool.service.js';
import { MemoryService } from '../memory/memory.service.js';
import { ContextService } from '../context/context.service.js';

export interface AIServiceConfig {
  configService?: ConfigService;
  toolService?: ToolService;
  maxToolIterations?: number;
}

export class AIService {
  private configService: ConfigService;
  private toolService: ToolService;
  private provider: OpenAIProvider | null = null;
  private maxToolIterations: number;

  constructor(config?: AIServiceConfig) {
    this.configService = config?.configService || defaultConfigService;
    this.toolService = config?.toolService || defaultToolService;
    this.maxToolIterations = config?.maxToolIterations || 30;
  }

  /**
   * 获取或创建 Provider
   */
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

  /**
   * 简单聊天
   */
  async chat(
    messages: ChatMessage[],
    options: ChatOptions = {}
  ): Promise<ChatResponse> {
    const provider = this.getProvider();
    return provider.chat(messages, options);
  }

  /**
   * 使用 ReAct 模式聊天
   */
  async chatWithReAct(
    userMessage: string,
    options?: {
      sessionId?: string;
      projectPath?: string;
      memoryService?: MemoryService;
      contextService?: ContextService;
      onStep?: (state: ReActState, iteration: number) => void;
    }
  ): Promise<ReActState> {
    const provider = this.getProvider();

    const agent = new ReActAgent({
      provider,
      toolService: this.toolService,
      maxIterations: this.maxToolIterations,
      systemPrompt: this.buildSystemPrompt(options?.projectPath, options?.contextService),
    });

    const result = await agent.run(userMessage, options?.onStep);

    if (options?.sessionId && options?.memoryService) {
      options.memoryService.addMessage(options.sessionId, 'user', userMessage, true);
      if (result.answer) {
        options.memoryService.addMessage(options.sessionId, 'assistant', result.answer, true);
      }
    }

    return result;
  }

  /**
   * 流式聊天
   */
  async *chatStream(
    messages: ChatMessage[],
    options: ChatOptions = {}
  ): AsyncGenerator<string, void, unknown> {
    const provider = this.getProvider();
    yield* provider.chatStream(messages, options);
  }

  /**
   * 设置 API Key
   */
  setApiKey(apiKey: string): void {
    this.provider = new OpenAIProvider({ apiKey });
  }

  /**
   * 设置 Base URL
   */
  setBaseUrl(baseUrl: string): void {
    const providerConfig = this.configService.getDefaultProvider();
    this.provider = new OpenAIProvider({
      apiKey: providerConfig?.apiKey || '',
      baseUrl,
    });
  }

  /**
   * 重置 Provider
   */
  resetProvider(): void {
    this.provider = null;
  }

  /**
   * 构建系统提示
   */
  private buildSystemPrompt(
    projectPath?: string,
    contextService?: ContextService
  ): string {
    let prompt = `你是一个 AI 编程助手，帮助用户进行软件开发。

核心能力：
1. 代码编写和重构
2. Bug 调试和修复
3. 代码审查和优化
4. 技术问题解答

请用中文回复，代码保持原有风格。`;

    if (projectPath && contextService) {
      const summary = contextService.getProjectSummary(projectPath);
      prompt += `\n\n当前项目信息：\n${summary}`;
    }

    return prompt;
  }
}

export const aiService = new AIService();