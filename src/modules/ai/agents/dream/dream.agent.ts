import { BaseProvider } from '../../ai.types.js'
import { getProviderTools } from '../../../tools/provider/index.js'
import { DREAM_TOOLS } from './agent_tool.js'
import type { Tool, ToolContext } from '../../../tools/tool.types.js'
import type { ChatMessage } from '../../ai.types.js'

export interface DreamAgentConfig {
  provider: BaseProvider
  workDir?: string
}

export class DreamAgent {
  name = 'dream'
  tools = DREAM_TOOLS

  private provider: BaseProvider
  private workDir: string
  private rawToolsMap: Map<string, Tool> = new Map()

  constructor(config: DreamAgentConfig) {
    this.provider = config.provider
    this.workDir = config.workDir || ''
  }

  async run(type: string, userMessage: string): Promise<void> {
    if (!userMessage) throw new Error('[DreamAgent] userMessage 不能为空')

    const systemPrompt = await this.buildPrompt(type)

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt + `\n\n项目目录: ${this.workDir}` },
      { role: 'user', content: userMessage },
    ]

    await this.initTools()
    await this.runLoop(messages)
  }

  private async runLoop(messages: ChatMessage[]): Promise<void> {
    const maxIterations = 50
    let iteration = 0

    while (iteration < maxIterations) {
      iteration++
      const response = await this.provider.chat(messages, {
        tools: this.getToolDefs(),
        sessionId: 'dream-agent',
        modelName: this.provider.getModel(),
      })

      if (!response.toolCalls || response.toolCalls.length === 0) {
        break
      }

      const toolCalls = response.toolCalls.map((tc: any) => ({
        id: tc.id,
        name: tc.function.name,
        arguments: typeof tc.function.arguments === 'string'
          ? JSON.parse(tc.function.arguments)
          : tc.function.arguments,
      }))

      for (const toolCall of toolCalls) {
        const result = await this.executeTool(toolCall.name, toolCall.arguments)

        messages.push({
          role: 'assistant',
          content: null as any,
          toolCalls: [{
            id: toolCall.id,
            type: 'function' as const,
            function: {
              name: toolCall.name,
              arguments: JSON.stringify(toolCall.arguments),
            },
          }],
        })

        messages.push({
          role: 'tool',
          content: result.success ? result.data || '' : `Error: ${result.error}`,
          toolCallId: toolCall.id,
        })
      }
    }
  }

  private async initTools(): Promise<void> {
    const allTools = await getProviderTools()
    for (const tool of allTools) {
      if ((DREAM_TOOLS as readonly string[]).includes(tool.name)) {
        this.rawToolsMap.set(tool.name, tool)
      }
    }
  }

  private getToolDefs(): any[] {
    return Array.from(this.rawToolsMap.values()).map(tool => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }))
  }

  private async executeTool(
    name: string,
    args: Record<string, any>
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    const tool = this.rawToolsMap.get(name)
    if (!tool) {
      const available = Array.from(this.rawToolsMap.keys()).join(', ')
      return { success: false, error: `Tool not found: ${name}. Available: ${available}` }
    }

    const context: ToolContext = {
      sessionId: 'dream-agent',
      workDir: this.workDir,
    }

    try {
      const result = await tool.execute(args, context)
      return { success: result.success, data: result.output, error: result.error }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  }

  private async buildPrompt(type: string): Promise<string> {
    const fsPromises = await import('fs/promises')
    const path = await import('path')
    const { fileURLToPath } = await import('url')
    const __filename = fileURLToPath(import.meta.url)
    const __dirname = path.dirname(__filename)
    const promptPath = path.join(__dirname, 'prompts', `${type}.txt`)
    return await fsPromises.readFile(promptPath, 'utf-8')
  }
}
