/**
 * Tools 模块类型定义
 */

export interface Tool {
  name: string
  description: string
  parameters: {
    type: 'object'
    properties: Record<string, any>
    required?: string[]
  }
  execute: (params: any, context: ToolContext) => Promise<ToolResult>
}

export interface ToolContext {
  sessionId: string
  workDir: string
  abortSignal?: AbortSignal
  onProgress?: (msg: string) => void
}

export interface ToolResult {
  success: boolean
  output: string
  error?: string
  metadata?: Record<string, any>
}
