/**
 * AI 服务模块
 * 
 * 本模块是 TXCode 的核心 AI 服务层，负责：
 * 1. AI Provider 管理 - 创建和管理 OpenAI/自定义 API 提供商
 * 2. 对话接口 - 提供 chat() 和 chatStream() 方法
 * 3. ReAct 集成 - 通过 ReActAgent 执行工具调用循环
 * 4. 上下文管理 - 加载会话历史、项目上下文
 * 5. 自动压缩 - 当 Token 达到阈值时自动压缩会话历史
 * 
 * 使用方式：
 *   import { aiService } from '../modules/ai/index.js';
 *   const result = await aiService.chatWithReAct("帮我读取文件", { sessionId: "xxx" });
 */

import { ConfigService, configService as defaultConfigService } from '../config/config.service.js';
import { OpenAIProvider } from './openai.provider.js';
import { ReActAgent } from './react.agent.js';
import { OpenAIAgent } from './provider/openai/openai-agent.js';
import { ChatMessage, ChatOptions, ChatResponse, ReActState } from './ai.types.js';
import { ProviderRunResult } from './provider/base.js';
import { ToolService, toolService as defaultToolService } from '../tools/tool.service.js';
import { MemoryService } from '../memory/memory.service.js';
import { ContextService } from '../context/context.service.js';
import { SessionService, sessionService as defaultSessionService } from '../session/session.service.js';
import { SkillsManager } from '../skill/skills.manager.js';
import { ReActResult, ReActStep } from './react/react.types.js';
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
  /** 技能管理器 (自定义技能) */
  skillsManager?: SkillsManager;
  /** ReAct Agent 最大迭代次数 */
  maxToolIterations?: number;
}

/**
 * AIService 类
 * 
 * AI 服务的封装类，提供以下功能：
 * - chat(): 简单的 AI 对话
 * - chatStream(): 流式 AI 对话
 * - chatWithReAct(): 带工具调用的 AI 对话
 * 
 * 典型使用流程：
 * 1. 用户发送消息 -> API 路由接收
 * 2. API 调用 aiService.chatWithReAct()
 * 3. AIService 获取会话历史，构建消息列表
 * 4. 创建 ReActAgent 并执行循环
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
  /** 技能管理器实例 (可选) */
  private skillsManager?: SkillsManager;
  /** AI Provider 实例 (延迟初始化) */
  private provider: OpenAIProvider | null = null;
  /** ReAct Agent 最大迭代次数 */
  private maxToolIterations: number;

  /**
   * 构造函数
   * 
   * @param config - AIServiceConfig 配置对象
   *   - 如果不提供配置，使用默认服务实例
   *   - 允许自定义 ConfigService、ToolService、SkillsManager 等
   */
  constructor(config?: AIServiceConfig) {
    this.configService = config?.configService || defaultConfigService;
    this.toolService = config?.toolService || defaultToolService;
    this.sessionService = defaultSessionService;
    this.skillsManager = config?.skillsManager;
    // 从配置文件读取最大迭代次数，默认值为 txConfig.maxToolIterations
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
  private getProvider(): OpenAIProvider {
    // 延迟初始化：只有当 provider 为 null 时才创建
    if (!this.provider) {
      // ========== 获取默认 AI 提供商配置 ==========
      const providerConfig = this.configService.getDefaultProvider();
      if (!providerConfig) {
        throw new Error('No default AI provider configured');
      }

      // ========== 获取模型列表 ==========
      const models = this.configService.getModels(providerConfig.id);
      // 找到启用的模型，如果没有启用任何模型则默认使用 gpt-4
      const defaultModel = models.find(m => m.enabled) || { name: 'gpt-4' };

      // ========== 创建 Provider 实例 ==========
      this.provider = new OpenAIProvider({
        apiKey: providerConfig.apiKey,           // API 密钥
        baseUrl: providerConfig.baseUrl,         // API 基础 URL
        defaultModel: defaultModel.name,         // 默认模型名称
      });
    }
    return this.provider;
  }

  /**
   * 简单的 AI 对话接口
   * 
   * 与 chatWithReAct 的区别：
   * - 不执行 ReAct 循环
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
   * 这是 TXCode 最核心的方法，执行 ReAct 循环来完成任务
   * 
   * 执行流程：
   * 1. 获取/创建 AI Provider
   * 2. 获取会话历史消息
   * 3. 创建 ReActAgent
   * 4. 执行 agent.run() 启动 ReAct 循环
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
   * @returns {Promise<ReActResult>} ReAct 执行结果
   */
  async chatWithReAct(
    userMessage: string,
    options?: {
      sessionId?: string;
      projectPath?: string;
      memoryService?: MemoryService;
      contextService?: ContextService;
      onStep?: (step: any, iteration: number) => void;
      onCompact?: (info: { beforeTokens: number; afterTokens: number }) => void;
    }
  ): Promise<ReActResult | ProviderRunResult> {
    const provider = this.getProvider();
    const sessionId = options?.sessionId;
    const aiMode = txConfig.ai.aiMode || 'react';

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

    if (aiMode === 'provider') {
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

      const result = await agent.run(userMessage, {
        onStep: wrappedOnStep,
        historyMessages,
        sessionId,
        memoryService,
      });

      if (sessionId && result.usage) {
        this.sessionService.updateTokenUsage(
          sessionId,
          result.usage.promptTokens,
          result.usage.completionTokens
        );
      }

      return result;
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

    const wrappedOnStep = options?.onStep 
      ? (step: ReActStep, iteration: number, usage?: { promptTokens: number; completionTokens: number; totalTokens: number }) => {
          options.onStep?.(step as any, iteration);
          
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

    const result = await agent.run(userMessage, {
      onStep: wrappedOnStep,
      historyMessages,
    });

    // ========== 步骤 5: 更新 Token 统计 ==========
    // 每次对话完成后，更新会话的 Token 使用量统计
    if (sessionId && result.usage) {
      this.sessionService.updateTokenUsage(
        sessionId,
        result.usage.promptTokens,
        result.usage.completionTokens
      );
    }

    // ========== 步骤 6: 返回结果 ==========
    return result;
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
    // 使用 yield* 将 provider 的生成器直接转发
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
 *   const result = await aiService.chatWithReAct("问题", { sessionId: "xxx" });
 */
export const aiService = new AIService();
