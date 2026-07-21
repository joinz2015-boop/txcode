import fs from 'fs'
import path from 'path'
import { Tool, ToolContext, ToolResult } from '../tool.types.js'

const currentDir = import.meta.dirname
const web_shell_exec_description = fs.readFileSync(path.join(currentDir, 'web_shell_exec.txt'), 'utf-8')

const DEFAULT_TIMEOUT = 30000
const MAX_BYTES = 50 * 1024
const MAX_LINES = 2000

async function getShellChatService() {
  const mod = await import('../../../services/shellChat/shellChat.service.js')
  return mod.shellChatService
}

export const webShellExecTool: Tool = {
  name: 'web_shell_exec',
  description: web_shell_exec_description,
  parameters: {
    type: 'object',
    properties: {
      command: {
        type: 'string',
        description: '要执行的命令'
      },
      timeout: {
        type: 'number',
        description: '超时时间 ms（默认 30000）'
      }
    },
    required: ['command']
  },
  execute: async (params: { command: string; timeout?: number }, context: ToolContext): Promise<ToolResult> => {
    const { command, timeout = DEFAULT_TIMEOUT } = params

    try {
      const service = await getShellChatService()
      const sessionId = context.sessionId

      const sshClient = service.getSshClient(sessionId)
      if (!sshClient) {
        return {
          success: false,
          output: '',
          error: '当前会话未连接远程主机，请先在 WebShell 终端中建立 SSH 连接'
        }
      }

      return await service.execCommand(
        sessionId,
        command,
        timeout,
        MAX_BYTES,
        MAX_LINES
      )
    } catch (err: any) {
      return {
        success: false,
        output: '',
        error: err.message
      }
    }
  }
}
