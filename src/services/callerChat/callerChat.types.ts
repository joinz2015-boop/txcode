export interface CallerChatInput {
  message: string
  sessionId?: string
  projectPath?: string
  enableDevLog?: boolean
  abortSignal?: AbortSignal
  onStep?: (step: CallerStep, iteration: number, usage?: any) => void
  onCompact?: (info: { beforeTokens: number; afterTokens: number; summary?: string }) => void
}

export interface CallerChatOptions {
  sessionId: string
  projectPath?: string
  enableDevLog?: boolean
  abortSignal?: AbortSignal
  onStep?: (step: CallerStep, iteration: number, usage?: any) => void
  onCompact?: (info: { beforeTokens: number; afterTokens: number; summary?: string }) => void
}

export interface CallerChatResult {
  answer: string
  iterations: number
  success: boolean
  usage?: any
  reactSteps?: any[]
  sessionId?: string
}

export interface CallerStep {
  thought?: string
  toolCalls?: CallerToolCall[]
  success?: boolean
}

export interface CallerToolCall {
  id?: string
  type?: string
  function: {
    name: string
    arguments: string | Record<string, any>
  }
}

export interface CallerInitInput {
  callbackUrl: string
  projectPath: string
  sessionId?: string
  title?: string
  tools: any[]
  systemPrompt?: string
  apiUrl?: string
  apiKey?: string
  modelName?: string
  toolTimeout?: number
}

export interface CallerInitResult {
  sessionId: string
  title: string
  toolsCount: number
}
