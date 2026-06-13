/**
 * Caller 聊天服务
 * 
 * 管理 CallerAgent 会话生命周期：
 * - initAgent：注册扩展工具、创建 AI provider、建立 AgentSession
 * - handleChat：创建 CallerAgent → 恢复历史消息 → 执行 AI 对话
 * 
 * 与 codeChatService 的关键差异：
 * - agent 不在构造时创建，而是 init 阶段创建（需要 callbackUrl 和扩展工具）
 * - 支持外部传入 apiUrl/apiKey/modelName 覆盖系统默认 AI 配置
 */
import { configService as defaultConfigService } from '../../services/config/config.service.js'
import { sessionService as defaultSessionService } from '../../services/session/session.service.js'
import { memoryService } from '../../services/memory/index.js'
import { CallerChatInput, CallerChatOptions, CallerChatResult, CallerStep, CallerInitInput, CallerInitResult } from './callerChat.types.js'
import type { Session } from '../../entity/session.entity.js'
import { ConfigService } from '../../services/config/config.service.js'
import { createProvider } from '../../core/ai/provider.js'
import { CallerAgent } from '../../core/ai/agents/caller/caller.agent.js'
import { SummarizerService } from '../../services/ai/summarizer/index.js'
import { ChatMessage, BaseProvider } from '../../core/ai/ai.types.js'
import { ExtendedToolDef } from '../../core/ai/agents/caller/types.js'

interface AgentSession {
  sessionId: string
  callbackUrl: string
  extendedTools: ExtendedToolDef[]
  systemPrompt: string
  toolTimeout: number
  provider: BaseProvider
}

export class CallerChatService {
  private configService: ConfigService
  private sessionService: typeof defaultSessionService
  /** agent 按 sessionId 存储，支持多个外部系统同时连接 */
  private agentSessions: Map<string, AgentSession> = new Map()

  constructor(config?: { configService?: ConfigService; sessionService?: typeof defaultSessionService }) {
    this.configService = config?.configService || defaultConfigService
    this.sessionService = config?.sessionService || defaultSessionService
  }

  /**
   * 初始化 Agent 会话
   * 
   * 校验：callbackUrl 必填、projectPath 必填、扩展工具名不与内置工具冲突
   * 
   * 副作用：
   * - 创建 session（或复用已有 sessionId 的 session）
   * - 创建 AI provider（支持外部传入或使用系统默认配置）
   * - 将 AgentSession 存入 agentSessions Map
   */
  initAgent(input: CallerInitInput): CallerInitResult {
    if (!input.callbackUrl) {
      throw new Error('callbackUrl is required')
    }

    if (!input.projectPath) {
      throw new Error('projectPath is required')
    }

    const tools = input.tools || []
    const builtinNames = ['read_file', 'write_file', 'edit_file', 'bash', 'glob', 'grep', 'web_search', 'web_fetch']

    // 扩展工具名不能与内置工具冲突
    for (const tool of tools) {
      if (builtinNames.includes(tool.name)) {
        throw new Error(`工具名冲突: ${tool.name} 是内置工具`)
      }
    }

    const sessionId = input.sessionId || crypto.randomUUID()
    const title = input.title || 'Caller Chat'
    const projectPath = input.projectPath

    // 复用已有 session 或新建
    let session = this.sessionService.get(sessionId)
    if (!session) {
      session = this.sessionService.createWithId(sessionId, title, projectPath)
    }
    this.sessionService.switchTo(session.id)

    // 优先使用外部传入的 apiUrl/apiKey，否则用系统默认配置
    const provider = this.createProvider(input.apiUrl, input.apiKey, input.modelName)

    this.agentSessions.set(sessionId, {
      sessionId,
      callbackUrl: input.callbackUrl,
      extendedTools: tools,
      systemPrompt: input.systemPrompt || '',
      toolTimeout: input.toolTimeout || 30000,
      provider,
    })

    return {
      sessionId,
      title,
      toolsCount: builtinNames.length + tools.length,
    }
  }

  /**
   * 创建 AI Provider
   * 优先使用外部传入的 apiUrl + apiKey，否则回退到系统默认配置
   */
  private createProvider(apiUrl?: string, apiKey?: string, modelName?: string): BaseProvider {
    if (apiUrl && apiKey) {
      return createProvider({
        apiKey,
        baseUrl: apiUrl,
        defaultModel: modelName || 'gpt-4',
      })
    }

    const defaultModel = modelName || this.configService.getDefaultModel()
    const providerConfig = this.configService.getModelProvider(defaultModel)

    if (!providerConfig) {
      throw new Error(`Provider not found for model: ${defaultModel}`)
    }

    return createProvider({
      apiKey: providerConfig.apiKey,
      baseUrl: providerConfig.baseUrl,
      defaultModel: defaultModel,
    })
  }

  /** 处理聊天请求：获取或创建 session，执行 AI 对话 */
  async handleChat(input: CallerChatInput): Promise<CallerChatResult> {
    const session = this.getOrCreateSession(input)

    return this.chatWithAI(input.message, {
      sessionId: session.id,
      projectPath: session.projectPath ?? undefined,
      enableDevLog: input.enableDevLog,
      abortSignal: input.abortSignal,
      onStep: input.onStep,
      onCompact: input.onCompact,
    })
  }

  private getOrCreateSession(input: CallerChatInput): Session {
    let session = input.sessionId ? this.sessionService.get(input.sessionId) : null
    if (!session) {
      session = this.sessionService.create('New Chat', input.projectPath || undefined)
    }
    this.sessionService.switchTo(session.id)
    return session
  }

  /**
   * 执行 AI 对话
   * 
   * 流程：
   * 1. 从 agentSessions 获取已注册的 AgentSession（未 init 则报错）
   * 2. 从 memoryService 恢复历史消息（支持断线重连后继续对话）
   * 3. 创建 CallerAgent 实例（传入 callbackUrl + 扩展工具）
   * 4. 执行 agent.run() → 通过 onStep/onCompact 回调通知上层
   * 5. 更新 session token 用量
   */
  private async chatWithAI(message: string, options: CallerChatOptions): Promise<CallerChatResult> {
    const reactSteps: any[] = []
    const sessionId = options.sessionId

    const agentSession = this.agentSessions.get(sessionId)
    if (!agentSession) {
      throw new Error('请先发送 init 初始化会话')
    }

    const provider = agentSession.provider

    const summarizer = new SummarizerService(
      this.sessionService,
      memoryService,
      this.configService
    )

    // 恢复历史消息（断线重连场景）
    let historyMessages: ChatMessage[] = []
    if (sessionId) {
      const session = this.sessionService.get(sessionId)
      const summaryMessageId = session?.summaryMessageId || null
      const msgs = memoryService.getMessagesForAI(sessionId, summaryMessageId)
      historyMessages = msgs.map(m => {
        const chatMsg: ChatMessage = {
          role: m.role as 'user' | 'assistant' | 'system' | 'tool',
          content: m.content,
        }

        // 还原 assistant_with_tools 和 tool_result 格式
        try {
          const parsed = JSON.parse(m.content)
          if (parsed.type === 'assistant_with_tools' && parsed.toolCalls) {
            chatMsg.content = ''
            chatMsg.toolCalls = parsed.toolCalls
            if (parsed.thought) {
              (chatMsg as any).reasoning = parsed.thought
            }
          } else if (parsed.type === 'tool_result') {
            chatMsg.content = parsed.output || ''
            chatMsg.toolCallId = parsed.toolCallId
          } else if (parsed.thought) {
            (chatMsg as any).reasoning = parsed.thought
          }
        } catch { }

        return chatMsg
      })
    }

    // 创建 CallerAgent，注入扩展工具和回调配置
    const agent = new CallerAgent({
      provider,
      maxIterations: 50,
      projectPath: options.projectPath,
      sessionId,
      memoryService,
      summarizer,
      sessionService: this.sessionService,
      callbackUrl: agentSession.callbackUrl,
      extendedTools: agentSession.extendedTools,
      systemPrompt: agentSession.systemPrompt,
      toolTimeout: agentSession.toolTimeout,
    })

    // AbortController 串联：外部 signal + 内部 controller
    const abortController = new AbortController()
    const abortHandler = () => abortController.abort()
    if (options.abortSignal) {
      options.abortSignal.addEventListener('abort', abortHandler)
    }

    try {
      let userMessage = message
      // 启用 devlog 时在消息末尾追加 devlog 指令
      if (options.enableDevLog) {
        const date = new Date().toISOString().slice(0, 10)
        const sessionIdSuffix = sessionId.slice(-12)
        userMessage = message + `\n\n开发过程中你需要在 devlog.md 文件中记录你的修改记录，文件路径为：.txcode/session/${date}/${sessionIdSuffix}/devlog.md`
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
          }))
          const reactFormatStep: CallerStep = {
            thought: step.reasoning || '',
            toolCalls,
            success: step.results?.[0]?.success ?? true,
          }
          reactSteps.push({ iteration, ...reactFormatStep })
          options.onStep?.(reactFormatStep, iteration, usage)
        },
        onCompact: options.onCompact,
        historyMessages,
        sessionId,
      })

      // 更新 session token 统计
      if (sessionId && result.usage) {
        this.sessionService.updateTokenUsage(
          sessionId,
          result.usage.promptTokens,
          result.usage.completionTokens
        )
      }

      return {
        answer: result.answer || '',
        iterations: result.iterations || 0,
        success: result.success,
        usage: result.usage,
        reactSteps,
        sessionId: options.sessionId,
      }
    } finally {
      if (options.abortSignal) {
        options.abortSignal.removeEventListener('abort', abortHandler)
      }
    }
  }
}
