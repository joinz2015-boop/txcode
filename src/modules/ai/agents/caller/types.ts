export interface ExtendedToolDef {
  name: string
  description: string
  parameters: {
    type: 'object'
    properties: Record<string, {
      type: string
      description: string
      enum?: string[]
    }>
    required?: string[]
  }
}

export interface ToolCallHttpRequest {
  toolName: string
  arguments: Record<string, any>
  sessionId: string
}

export interface ToolCallHttpResponse {
  success: boolean
  output?: string
  error?: string
}

export interface CallerInitConfig {
  callbackUrl: string
  sessionId?: string
  title?: string
  projectPath?: string
  tools: ExtendedToolDef[]
  systemPrompt?: string
  apiUrl?: string
  apiKey?: string
  modelName?: string
  toolTimeout?: number
}
