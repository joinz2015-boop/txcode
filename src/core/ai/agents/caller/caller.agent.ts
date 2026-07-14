/**
 * CallerAgent — 被外部系统调用的 AI Agent
 * 
 * 与 CodeAgent 关键差异：
 * - 工具分内置（本地执行）和扩展（HTTP 回调到外部系统）
 * - 提示词不含 memory-context（caller 不加载项目记忆）
 * - 不支持 specInjector / hooks
 * - 扩展工具通过 HTTP POST 到 callbackUrl 执行，默认 30s 超时
 */
import { BaseProvider, ChatMessage, MultimodalContent } from '../../ai.types.js'
import { createIterationSignal } from '../../helpers/abort.helper.js'
import { AgentToolRegistry, buildToolContext } from '../agent.tool.js'
import {
  AIProvider,
  ProviderRunOptions,
  ProviderRunResult,
  ProviderStep,
  ProviderToolResult,
  ProviderTokenUsage,
} from '../../provider/base.js'
import { buildAvailableSkillsPrompt } from '../../../../services/skill/skill.tool.js'
import type { MemoryService } from '../../../../services/memory/memory.service.js'
import type { SummarizerAgent } from '../summarizer/summarizer.agent.js'
import type { SessionService } from '../../../../services/session/session.service.js'
import { ExtendedToolDef } from './types.js'
import { CALLER_DEFAULT_TOOLS } from './agent_tool.js'

/** 加载 Caller 专属角色提示词模板（prompts/role.txt） */
async function loadRoleTemplate(): Promise<string> {
  try {
    const fs = await import('fs/promises')
    const path = await import('path')
    const { fileURLToPath } = await import('url')
    const __filename = fileURLToPath(import.meta.url)
    const __dirname = path.dirname(__filename)
    return await fs.readFile(path.join(__dirname, 'prompts', 'role.txt'), 'utf-8')
  } catch {
    return '你是 txcode Caller Agent，一个被外部系统调用的 AI 编码助手。'
  }
}

/**
 * 构建 Caller 系统提示词
 * 
 * 组装顺序：
 * 1. 角色模板（role.txt）
 * 2. 外部系统额外提示词（systemPrompt 参数，追加而非替换）
 * 3. 可用 Skills 列表
 * 4. 替换 {platform} / {workdir} 占位符
 */
export async function buildCallerPrompt(
  options?: { platform?: string; workdir?: string; systemPrompt?: string }
): Promise<string> {
  const roleTemplate = await loadRoleTemplate()
  let prompt = roleTemplate

  if (options?.systemPrompt) {
    prompt += '\n\n## 调用方系统特殊说明\n' + options.systemPrompt
  }

  const skillsPrompt = await buildAvailableSkillsPrompt()
  if (skillsPrompt) {
    prompt += '\n\n## 可用 Skills\n' + skillsPrompt
  }

  prompt = prompt
    .replace('{platform}', options?.platform || process.platform)
    .replace('{workdir}', options?.workdir || process.cwd())

  return prompt
}

export interface CallerAgentConfig {
  provider: BaseProvider
  maxIterations?: number
  projectPath?: string
  sessionId?: string
  memoryService?: MemoryService
  summarizer?: SummarizerAgent
  sessionService?: SessionService
  callbackUrl: string
  extendedTools: ExtendedToolDef[]
  systemPrompt?: string
  toolTimeout?: number
}

export class CallerAgent implements AIProvider {
  name = 'caller'
  keepContext = true

  /** 内置工具列表：始终可用，本地执行（引用 agent_tool.ts 单一来源） */
  private builtinTools: string[] = [...CALLER_DEFAULT_TOOLS]

  /** 扩展工具：init 时由外部系统传入，通过 HTTP 回调执行 */
  private extendedTools: ExtendedToolDef[] = []
  private callbackUrl: string = ''
  private systemPrompt: string = ''
  private toolTimeout: number = 30000

  private provider: BaseProvider
  private maxIterations: number
  private projectPath?: string
  private sessionId?: string
  private memoryService?: MemoryService
  private summarizer?: SummarizerAgent
  private sessionService?: SessionService
  private userMessage: string = ''
  /** Function Calling 格式的工具定义（供 AI API 使用） */
  private providerTools: any[] = []
  private providerToolsMap: Map<string, any> = new Map()
  private toolRegistry: AgentToolRegistry
  private extendedToolsSet: Set<string> = new Set()

  constructor(config: CallerAgentConfig) {
    this.provider = config.provider
    this.maxIterations = config.maxIterations || 50
    this.projectPath = config.projectPath
    this.sessionId = config.sessionId
    this.memoryService = config.memoryService
    this.summarizer = config.summarizer
    this.sessionService = config.sessionService
    this.callbackUrl = config.callbackUrl
    this.extendedTools = config.extendedTools || []
    this.systemPrompt = config.systemPrompt || ''
    this.toolTimeout = config.toolTimeout || 30000
    this.toolRegistry = new AgentToolRegistry(CALLER_DEFAULT_TOOLS)
    this.extendedToolsSet = new Set(this.extendedTools.map(t => t.name))
  }

  /** 返回所有可用工具名（内置 + 扩展） */
  get tools(): string[] {
    return [...this.builtinTools, ...this.extendedTools.map(t => t.name)]
  }

  /**
   * 执行 AI Function Calling 循环
   * 
   * 流程：
   * 1. 准备工具定义（内置 + 扩展 → Function Calling 格式）
   * 2. 构建系统提示词（buildCallerPrompt）
   * 3. 恢复历史消息
   * 4. 循环：
   *    a. 调用 AI API（携带工具列表）
   *    b. finishReason='stop' → 得到最终回复，退出
   *    c. finishReason='tool_calls' → 执行工具 → 结果加入消息 → 继续循环
   *    d. 超过 maxIterations → 返回失败
   */
  async run(
    userMessage: string,
    options?: ProviderRunOptions
  ): Promise<ProviderRunResult> {
    this.userMessage = userMessage

    // 准备 Function Calling 格式的工具定义
    this.providerTools = await this.getFilteredTools()
    this.providerToolsMap.clear()
    for (const t of this.providerTools) {
      this.providerToolsMap.set(t.function.name, t)
    }

    const steps: ProviderStep[] = []
    const baseMessages: ChatMessage[] = []
    const abortSignal = options?.abortSignal

    const builtinTools = this.providerTools
    const systemPrompt = await buildCallerPrompt({
      workdir: this.projectPath,
      systemPrompt: this.systemPrompt,
    })

    // 恢复历史消息
    if (options?.historyMessages && options.historyMessages.length > 0) {
      for (const msg of options.historyMessages) {
        if (msg.role !== 'system') {
          baseMessages.push(msg)
        }
      }
    }

    // 追加当前用户消息
    this.pushUserMessage(baseMessages, userMessage, options?.mediaFiles);
    this.addMessage('user', userMessage, true, true, undefined, undefined, this.sessionId, options?.mediaFiles);

    let iteration = 0
    let finalAnswer = ''
    let totalUsage: ProviderTokenUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 }

    // Function Calling 循环
    while (iteration < this.maxIterations) {
      if (abortSignal?.aborted) {
        throw new Error('ABORTED')
      }

      iteration++

      const messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        ...baseMessages,
      ]

      // 调用 AI API
      const { signal: iterSignal, cleanup } = createIterationSignal(abortSignal);
      const response = await this.provider.chat(messages, {
        tools: builtinTools,
        abortSignal: iterSignal,
        sessionId: this.sessionId,
        modelName: this.provider.getModel(),
      }).finally(() => cleanup());

      if (abortSignal?.aborted) {
        throw new Error('ABORTED')
      }

      if (response.usage) {
        totalUsage.promptTokens = response.usage.promptTokens
        totalUsage.completionTokens = response.usage.completionTokens
        totalUsage.totalTokens = response.usage.totalTokens
      }

      // AI 直接回复（无需调用工具）
      if (response.finishReason === 'stop' && response.content) {
        finalAnswer = response.content
        this.addMessage('assistant', finalAnswer, true, false, undefined, undefined, this.sessionId)
        break
      }

      // AI 请求调用工具
      if (response.finishReason === 'tool_calls' && response.toolCalls && response.toolCalls.length > 0) {
        const toolCalls = AgentToolRegistry.parseToolCalls(response.toolCalls)

        // 依次执行每个工具调用
        const results: ProviderToolResult[] = []
        const toolContext = buildToolContext({ sessionId: this.sessionId || '', projectPath: this.projectPath })
        for (const toolCall of toolCalls) {
          const result = await this.executeTool(toolCall.name, toolCall.arguments, abortSignal)
          results.push({
            name: toolCall.name,
            success: result.success,
            output: result.data,
            error: result.error,
          })
        }

        const step: ProviderStep = {
          reasoning: response.reasoning,
          toolCalls,
          results,
        }

        steps.push(step)
        options?.onStep?.(step, iteration, response.usage)

        // 将 assistant 消息和 tool 结果追加到对话上下文
        for (let i = 0; i < toolCalls.length; i++) {
          const toolCall = toolCalls[i]
          const result = results[i]

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
          }
          baseMessages.push(assistantMsg)
          const reactData = {
            type: 'assistant_with_tools',
            toolCalls: assistantMsg.toolCalls,
            thought: response.reasoning || '',
            success: result.success,
          }
          this.addMessage('assistant', JSON.stringify(reactData), true, false, undefined, undefined, this.sessionId)

          const toolMsg = {
            role: 'tool' as const,
            content: result.success ? result.output || '' : `Error: ${result.error}`,
            toolCallId: toolCall.id,
          }
          baseMessages.push(toolMsg)
          this.addMessage('tool', toolMsg.content, true, false, undefined, toolCall.id, this.sessionId)
        }

        continue
      }

      if (response.content) {
        finalAnswer = response.content
        break
      }

      break
    }

    const success = iteration < this.maxIterations && finalAnswer.length > 0

    return {
      answer: finalAnswer || steps[steps.length - 1]?.results?.[0]?.output || 'Unable to complete task',
      steps,
      iterations: iteration,
      success,
      error: iteration >= this.maxIterations ? 'Max iterations reached' : undefined,
      usage: totalUsage,
    }
  }

  getType(): string {
    return 'caller'
  }

  /**
   * 执行工具调用
   * 
   * 路由逻辑：
   * - 扩展工具 → executeExtendedTool（HTTP POST 到 callbackUrl）
   * - 内置工具 → 从 rawToolsMap 查找 Tool 对象，调用其 execute 方法
   * - 未找到 → 返回错误
   */
  private async executeTool(
    name: string,
    args: Record<string, any>,
    abortSignal?: AbortSignal
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    if (this.extendedToolsSet.has(name)) {
      return await this.executeExtendedTool(name, args, abortSignal)
    }

    const toolContext = buildToolContext({ sessionId: this.sessionId || '', projectPath: this.projectPath })
    return await this.toolRegistry.execute(name, args, toolContext)
  }

  /**
   * 执行扩展工具：HTTP POST 到外部系统 callbackUrl
   * 
   * 请求体：{ toolName, arguments, sessionId }
   * 响应体：{ success, output?, error? }
   * 
   * 超时控制：默认 30s（可通过 init 的 toolTimeout 配置）
   * Abort 传播：外部 abortSignal + 内部超时 timer 双重保障
   */
  private async executeExtendedTool(
    name: string,
    args: Record<string, any>,
    abortSignal?: AbortSignal
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.toolTimeout)

    // 外部 stop 信号传播到 HTTP 请求
    let onAbort: (() => void) | undefined;
    if (abortSignal) {
      onAbort = () => controller.abort();
      abortSignal.addEventListener('abort', onAbort);
    }

    try {
      const response = await fetch(this.callbackUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolName: name,
          arguments: args,
          sessionId: this.sessionId || '',
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        const body = await response.text().catch(() => '')
        return { success: false, error: `HTTP ${response.status}: ${body}` }
      }

      const result = await response.json() as { success: boolean; output?: string; error?: string }
      if (result.success) {
        return { success: true, data: result.output || '' }
      }
      return { success: false, error: result.error || 'Unknown error' }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return { success: false, error: 'Tool call timeout or aborted' }
      }
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    } finally {
      clearTimeout(timeoutId)
      if (abortSignal && onAbort) {
        abortSignal.removeEventListener('abort', onAbort);
      }
    }
  }

  /**
   * 获取合并后的 Function Calling 工具定义
   * 内置工具从 getProviderTools 过滤，扩展工具直接使用外部传入的定义
   */
  private async getFilteredTools(): Promise<any[]> {
    const builtinDefs = await this.toolRegistry.getDefinitions()

    const extendedDefs = this.extendedTools.map(tool => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }))

    return [...builtinDefs, ...extendedDefs]
  }

  /** 将消息写入 memoryService，用于断线重连后恢复上下文 */
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
    if (!sessionId || !this.memoryService) return

    let savedContent = content
    if (role === 'assistant' && toolCalls && toolCalls.length > 0) {
      savedContent = JSON.stringify({ type: 'assistant_with_tools', toolCalls })
    } else if (role === 'tool' && toolCallId) {
      savedContent = JSON.stringify({ type: 'tool_result', toolCallId, output: content })
    }

    this.memoryService.addMessage(sessionId, role, savedContent, keepContext, isOriginal,
      role === 'user' && mediaFiles ? mediaFiles.map(mf => ({ filePath: mf.filePath, type: mf.type })) : undefined
    )
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
