/**
 * AI 服务模块
 * 
 * 本模块是 TXCode 的核心 AI 服务层，负责：
 * 1. AI Provider 管理 - 创建和管理 OpenAI/自定义 API 提供商
 * 2. 对话接口 - 提供 chat() 和 chatStream() 方法
 * 3. Function Calling 集成 - 通过 OpenAIAgent 执行工具调用循环
 * 4. 上下文管理 - 加载会话历史、项目上下文
 * 5. 自动压缩 - 当 Token 达到阈值时自动压缩会话历史
 * 
 * 使用方式：
 *   import { aiService } from '../modules/ai/index.js';
 *   const result = await aiService.chatWithTools("帮我读取文件", { sessionId: "xxx" });
 */

import { ConfigService, configService as defaultConfigService } from '../config/config.service.js';
import { OpenAIProvider } from './openai.provider.js';
import { OpenAIAgent } from './provider/openai/openai-agent.js';
import { ChatMessage, ChatOptions, ChatResponse } from './ai.types.js';
import { ProviderRunResult } from './provider/base.js';
import { ToolService, toolService as defaultToolService } from '../tools/tool.service.js';
import { MemoryService } from '../memory/memory.service.js';
import { ContextService } from '../context/context.service.js';
import { SessionService, sessionService as defaultSessionService } from '../session/session.service.js';
import { SummarizerService } from './summarizer/index.js';
import txConfig from '../../config/tx.config.js';

/**
 * AIService 构造函数配置参数
 */
export interface AIServiceConfig {
  /** 配置服务 (AI Provider、模型等配置) */
  configService?: ConfigService;
  /** 工具服务 (内置/自定义工具) */
  toolService?: ToolService;
  /** Function Calling Agent 最大迭代次数 */
  maxToolIterations?: number;
}

/**
 * AIService 类
 * 
 * AI 服务的封装类，提供以下功能：
 * - chat(): 简单的 AI 对话
 * - chatStream(): 流式 AI 对话
 * - chatWithTools(): 带工具调用的 AI 对话
 * 
 * 典型使用流程：
 * 1. 用户发送消息 -> API 路由接收
 * 2. API 调用 aiService.chatWithTools()
 * 3. AIService 获取会话历史，构建消息列表
 * 4. 创建 OpenAIAgent 并执行循环
 * 5. 返回结果给 API
 * 6. API 返回给客户端
 */
export class AIService {
  /** 配置服务实例 */
  private configService: ConfigService;
  /** 工具服务实例 */
  private toolService: ToolService;
  /** 会话服务实例 */
  private sessionService: SessionService;
  /** AI Provider 实例 (延迟初始化) */
  private provider: OpenAIProvider | null = null;
  /** Function Calling Agent 最大迭代次数 */
  private maxToolIterations: number;

  /**
   * 构造函数
   * 
   * @param config - AIServiceConfig 配置对象
   *   - 如果不提供配置，使用默认服务实例
   *   - 允许自定义 ConfigService、ToolService 等
   */
  constructor(config?: AIServiceConfig) {
    this.configService = config?.configService || defaultConfigService;
    this.toolService = config?.toolService || defaultToolService;
    this.sessionService = defaultSessionService;
    this.maxToolIterations = config?.maxToolIterations || txConfig.maxToolIterations;
  }

  /**
   * 获取 AI Provider 实例
   * 
   * 使用延迟初始化模式：
   * - 第一次调用时创建 Provider 实例
   * - 后续调用直接返回缓存的实例
   * 
   * Provider 创建流程：
   * 1. 从配置服务获取默认 AI 提供商
   * 2. 获取该提供商的模型列表
   * 3. 找到启用的模型 (或默认使用 gpt-4)
   * 4. 创建 OpenAIProvider 实例
   * 
   * @returns {OpenAIProvider} AI Provider 实例
   * @throws {Error} 如果没有配置默认 AI 提供商
   */
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

  /**
   * 简单的 AI 对话接口
   * 
   * 与 chatWithTools 的区别：
   * - 不执行 Function Calling 循环
   * - 不支持工具调用
   * - 适用于简单的问答场景
   * 
   * @param messages - 消息数组 (包含 role 和 content)
   * @param options - 可选配置 (temperature, maxTokens, model 等)
   * @returns {Promise<ChatResponse>} AI 响应
   */
  async chat(
    messages: ChatMessage[],
    options: ChatOptions = {}
  ): Promise<ChatResponse> {
    const provider = this.getProvider();
    return provider.chat(messages, options);
  }

  /**
   * 带工具调用的 AI 对话接口 (核心方法)
   * 
   * 这是 TXCode 最核心的方法，执行 Function Calling 循环来完成任务
   * 
   * 执行流程：
   * 1. 获取/创建 AI Provider
   * 2. 获取会话历史消息
   * 3. 创建 OpenAIAgent
   * 4. 执行 agent.run() 启动 Function Calling 循环
   * 5. 更新会话 Token 统计
   * 6. 检查是否需要压缩会话 (自动摘要)
   * 7. 返回结果
   * 
   * @param userMessage - 用户输入的消息
   * @param options - 配置选项
   *   - sessionId: 会话 ID
   *   - projectPath: 项目路径
   *   - memoryService: 记忆服务实例
   *   - contextService: 上下文服务实例
   *   - onStep: 每一步执行完的回调
   * @returns {Promise<ProviderRunResult>} Function Calling 执行结果
   */
  async chatWithTools(
    userMessage: string,
    options?: {
      sessionId?: string;
      projectPath?: string;
      memoryService?: MemoryService;
      contextService?: ContextService;
      onStep?: (step: any, iteration: number) => void;
      onCompact?: (info: { beforeTokens: number; afterTokens: number }) => void;
      abortSignal?: AbortSignal;
      modelName?: string;
    }
  ): Promise<ProviderRunResult> {
    const provider = this.getProvider(options?.modelName);
    const sessionId = options?.sessionId;
    const externalAbort = options?.abortSignal;

    let historyMessages: ChatMessage[] = [];
    if (sessionId && options?.memoryService) {
      const session = this.sessionService.get(sessionId);
      const summaryMessageId = session?.summaryMessageId || null;
      const msgs = options.memoryService.getMessagesForAI(sessionId, summaryMessageId);
      historyMessages = msgs.map(m => {
        const chatMsg: ChatMessage = {
          role: m.role as 'user' | 'assistant' | 'system' | 'tool',
          content: m.content,
        };

        try {
          const parsed = JSON.parse(m.content);
          if (parsed.type === 'assistant_with_tools' && parsed.toolCalls) {
            chatMsg.content = '';
            chatMsg.toolCalls = parsed.toolCalls;
          } else if (parsed.type === 'tool_result') {
            chatMsg.content = parsed.output || '';
            chatMsg.toolCallId = parsed.toolCallId;
          }
        } catch { }

        return chatMsg;
      });
    }

    const memoryService = options?.memoryService || new MemoryService();
    const summarizer = new SummarizerService(
      this.sessionService,
      memoryService,
      this.configService
    );

    const agent = new OpenAIAgent({
      provider,
      toolService: this.toolService,
      maxIterations: this.maxToolIterations,
      projectPath: options?.projectPath,
      sessionId,
      memoryService,
    });

    const wrappedOnStep = options?.onStep
      ? (step: any, iteration: number, usage?: any) => {
          const reactFormatStep = {
            thought: step.reasoning || '',
            actions: (step.toolCalls || []).map((tc: any) => ({
              actionName: tc.name,
              actionInput: tc.arguments,
            })),
            observation: step.results?.[0]?.output || '',
          };
          options.onStep?.(reactFormatStep, iteration);

          if (sessionId && usage && usage.promptTokens > 0) {
            const check = summarizer.checkNeedsCompact(sessionId, usage.promptTokens);
            if (check.needed) {
              console.log(`[AutoCompact] ${check.reason}, triggering compaction during iteration ${iteration}...`);
              summarizer.compact({ sessionId }).then(() => {
                options?.onCompact?.({ beforeTokens: check.promptTokens, afterTokens: 0 });
              });
            }
          }
        }
      : undefined;

    const abortController = new AbortController();
    const abortHandler = () => abortController.abort();
    if (externalAbort) {
      externalAbort.addEventListener('abort', abortHandler);
    }

    try {
      const result = await agent.run(userMessage, {
        onStep: wrappedOnStep,
        historyMessages,
        sessionId,
        memoryService,
        abortSignal: abortController.signal,
      });

      if (sessionId && result.usage) {
        this.sessionService.updateTokenUsage(
          sessionId,
          result.usage.promptTokens,
          result.usage.completionTokens
        );
      }

      return result;
    } finally {
      if (externalAbort) {
        externalAbort.removeEventListener('abort', abortHandler);
      }
    }
  }

  /**
   * 流式 AI 对话接口
   * 
   * 使用 AsyncGenerator 实现流式响应
   * 每次 yield 返回一个内容块
   * 
   * @param messages - 消息数组
   * @param options - 可选配置
   * @returns {AsyncGenerator<string>} 异步生成器，逐块返回 AI 响应
   */
  async *chatStream(
    messages: ChatMessage[],
    options: ChatOptions = {}
  ): AsyncGenerator<string, void, unknown> {
    const provider = this.getProvider();
    yield* provider.chatStream(messages, options);
  }

  /**
   * 设置 API 密钥
   * 
   * 用于动态更新 AI Provider 的 API 密钥
   * 调用后会重置 provider 实例
   * 
   * @param apiKey - 新的 API 密钥
   */
  setApiKey(apiKey: string): void {
    this.provider = new OpenAIProvider({ apiKey });
  }

  /**
   * 设置 API 基础 URL
   * 
   * 用于切换到不同的 AI API 端点
   * 如从 OpenAI 切换到自定义兼容 API
   * 
   * @param baseUrl - 新的 API 基础 URL
   */
  setBaseUrl(baseUrl: string): void {
    const providerConfig = this.configService.getDefaultProvider();
    this.provider = new OpenAIProvider({
      apiKey: providerConfig?.apiKey || '',
      baseUrl,
    });
  }

  /**
   * 重置 AI Provider
   * 
   * 将 provider 设置为 null，下次调用时会重新创建
   * 用于强制刷新 Provider 配置
   */
  resetProvider(): void {
    this.provider = null;
  }
}

/**
 * AI 服务单例实例
 * 
 * 在整个应用中共享同一个 AIService 实例
 * 使用方式：
 *   import { aiService } from '../modules/ai/index.js';
 *   const result = await aiService.chatWithTools("问题", { sessionId: "xxx" });
 */
export const aiService = new AIService();