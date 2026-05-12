/**
 * Caller WebSocket 处理器
 * 
 * 处理 /ws/caller 路径的 WebSocket 消息
 * 供外部系统（A系统）接入，将 txcode 作为 AI 编码底层服务使用
 * 
 * 协议流程：
 * 1. 客户端连接 → 广播 connected
 * 2. 客户端发送 init（callbackUrl + projectPath + 扩展工具）→ 注册项目 → 创建会话 → 广播 init_ready
 * 3. 客户端发送 chat → 创建 CallerAgent → AI 推理循环 → 广播 step/done
 * 4. 内置工具本地执行，扩展工具 HTTP POST 到 callbackUrl
 * 5. 所有 S→C 消息广播给所有 /ws/caller 客户端，客户端根据 sessionId 过滤
 */
import { WebSocket } from 'ws'
import { sessionService } from '../../modules/session/index.js'
import { callerChatService } from '../../services/callerChat/index.js'
import { projectService } from '../../services/project/project.service.js'
import * as path from 'path'
import * as fs from 'fs'

const builtinNames = ['read_file', 'write_file', 'edit_file', 'bash', 'glob', 'grep', 'web_search', 'web_fetch']

export class CallerWebSocketHandler {
  private wsClients: Set<WebSocket> = new Set()
  private abortControllers: Map<string, AbortController> = new Map()

  /**
   * 处理新的 WebSocket 连接
   * 注册消息/关闭事件，发送 connected 消息
   */
  handle(ws: WebSocket): void {
    this.wsClients.add(ws)
    ws.send(JSON.stringify({ type: 'connected', message: 'WebSocket connected' }))

    ws.on('message', async (data: Buffer) => {
      try {
        const msg = JSON.parse(data.toString())
        await this.handleMessage(ws, msg)
      } catch (e) {
        this.broadcast({ type: 'error', error: 'Invalid message format' })
      }
    })

    ws.on('close', () => {
      this.wsClients.delete(ws)
    })
  }

  /**
   * 广播消息给所有已连接的 /ws/caller 客户端
   * 每条消息携带 sessionId，客户端自行过滤
   */
  private broadcast(message: any): void {
    const data = JSON.stringify(message)
    for (const client of this.wsClients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data)
      }
    }
  }

  /** 消息路由：根据 type 分发到对应处理方法 */
  private async handleMessage(ws: WebSocket, msg: any): Promise<void> {
    const { type, data } = msg

    switch (type) {
      case 'init':
        this.handleInit(data)
        break
      case 'chat':
        await this.handleChat(data)
        break
      case 'stop':
        this.handleStop(data)
        break
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong' }))
        break
      default:
        ws.send(JSON.stringify({ type: 'error', error: 'Unknown message type' }))
    }
  }

  /**
   * 处理 init 消息
   * 
   * 校验项：
   * - callbackUrl 必填且仅允许 http/https 协议
   * - projectPath 必填，目录不存在则自动创建
   * 
   * 执行：
   * 1. 解析 projectPath 为绝对路径，目录不存在则 mkdir
   * 2. 通过 projectService.createProject 注册项目（已存在则复用）
   * 3. 调用 callerChatService.initAgent 创建会话 + 注册扩展工具
   * 4. 广播 init_ready（含 sessionId, toolsCount）
   */
  private handleInit(data: any): void {
    try {
      if (!data || !data.callbackUrl) {
        this.broadcast({ type: 'error', error: 'callbackUrl is required' })
        return
      }

      if (!data.callbackUrl.startsWith('http://') && !data.callbackUrl.startsWith('https://')) {
        this.broadcast({ type: 'error', error: 'callbackUrl must use http:// or https:// protocol' })
        return
      }

      if (!data.projectPath) {
        this.broadcast({ type: 'error', error: 'projectPath is required' })
        return
      }

      // 转为绝对路径，不存在则创建
      const absPath = path.resolve(data.projectPath)
      if (!fs.existsSync(absPath)) {
        fs.mkdirSync(absPath, { recursive: true })
      }
      projectService.createProject(path.basename(absPath), absPath)

      const result = callerChatService.initAgent({
        callbackUrl: data.callbackUrl,
        sessionId: data.sessionId,
        title: data.title,
        projectPath: absPath,
        tools: data.tools || [],
        systemPrompt: data.systemPrompt,
        apiUrl: data.apiUrl,
        apiKey: data.apiKey,
        modelName: data.modelName,
        toolTimeout: data.toolTimeout,
      })

      this.broadcast({
        type: 'init_ready',
        data: {
          sessionId: result.sessionId,
          title: result.title,
          toolsCount: result.toolsCount,
        },
      })
    } catch (error) {
      this.broadcast({
        type: 'error',
        error: error instanceof Error ? error.message : 'Init failed',
      })
    }
  }

  /**
   * 处理 stop 消息
   * 通过 AbortController 中断正在进行的 AI 任务
   * 同时将 session 状态重置为 idle
   */
  private handleStop(data: any): void {
    const { sessionId } = data
    if (!sessionId) return

    const controller = this.abortControllers.get(sessionId)
    if (controller) {
      controller.abort()
      this.abortControllers.delete(sessionId)
      sessionService.setIdle(sessionId)
    }
  }

  /**
   * 处理 chat 消息
   * 
   * 流程：
   * 1. 校验 sessionId / message
   * 2. 获取或创建 session（断线重连时复用已有 session）
   * 3. 如果已有运行中任务则先 abort
   * 4. 创建 AbortController 注册到 abortControllers
   * 5. 调用 callerChatService.handleChat 执行 AI 对话
   * 6. 通过 onStep 回调广播 step 和 tool_call（扩展工具）
   * 7. 广播 done 或 error / stopped
   */
  private async handleChat(data: any): Promise<void> {
    const { message, sessionId, projectPath, enableDevLog } = data

    if (!sessionId) {
      this.broadcast({ type: 'error', error: 'sessionId is required' })
      return
    }

    if (!message) {
      this.broadcast({ type: 'error', error: 'message is required' })
      return
    }

    // 获取或创建 session（支持断线重连）
    let session = sessionService.get(sessionId)
    if (!session) {
      const title = message.length > 10 ? message.slice(0, 10) + '...' : message
      session = sessionService.createWithId(sessionId, title, projectPath)
    }

    // 如果已有运行中任务则先终止
    const existingController = this.abortControllers.get(sessionId)
    if (existingController) {
      existingController.abort()
    }

    const abortController = new AbortController()
    this.abortControllers.set(sessionId, abortController)

    try {
      sessionService.switchTo(session.id)
      sessionService.setProcessing(session.id)

      const result = await callerChatService.handleChat({
        message,
        sessionId: session.id,
        projectPath: projectPath || session.projectPath || undefined,
        enableDevLog,
        abortSignal: abortController.signal,
        // 每一步执行完回调：广播 step + 扩展工具单独通知 tool_call
        onStep: (step: any, iteration: number, usage?: any) => {
          this.broadcast({
            type: 'step',
            data: {
              ...step,
              iteration,
              sessionId: session.id,
              usage: usage ? {
                promptTokens: usage.promptTokens,
                completionTokens: usage.completionTokens,
                totalTokens: usage.totalTokens,
              } : undefined,
            },
          })

          // 扩展工具单独广播 tool_call 通知
          for (const tc of (step.toolCalls || [])) {
            const toolName = tc.function?.name || tc.name || ''
            if (builtinNames.indexOf(toolName) === -1) {
              this.broadcast({
                type: 'tool_call',
                data: {
                  sessionId: session.id,
                  toolName,
                  arguments: tc.function?.arguments || tc.arguments,
                  iteration,
                },
              })
            }
          }
        },
        // 上下文压缩回调
        onCompact: (info: { beforeTokens: number; afterTokens: number; summary?: string }) => {
          this.broadcast({ type: 'compact', data: { ...info, sessionId: session.id } })
        },
      })

      this.broadcast({
        type: 'done',
        data: {
          sessionId: session.id,
          response: result.answer,
          iterations: result.iterations,
          success: result.success,
          usage: result.usage ? {
            promptTokens: result.usage.promptTokens,
            completionTokens: result.usage.completionTokens,
            totalTokens: result.usage.totalTokens,
          } : undefined,
        },
      })
      sessionService.setCompleted(session.id)
    } catch (error) {
      // 区分用户主动取消 vs 真实错误
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      const isAbort = error instanceof Error && (
        error.name === 'AbortError' ||
        errorMsg === 'ABORTED' ||
        errorMsg.toLowerCase().includes('abort')
      )
      if (isAbort) {
        this.broadcast({ type: 'stopped', sessionId: session?.id || sessionId, reason: 'user_cancelled' })
      } else {
        this.broadcast({ type: 'error', sessionId: session?.id || sessionId, error: errorMsg })
      }
      sessionService.setIdle(sessionId)
    } finally {
      this.abortControllers.delete(sessionId)
    }
  }
}

export const callerWebSocketHandler = new CallerWebSocketHandler()
