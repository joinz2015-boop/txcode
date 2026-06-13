import { BaseProvider } from '../../ai.types.js'
import { AgentToolRegistry, buildToolContext } from '../agent.tool.js'
import { DREAM_TOOLS } from './agent_tool.js'
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
  private toolRegistry: AgentToolRegistry

  constructor(config: DreamAgentConfig) {
    this.provider = config.provider
    this.workDir = config.workDir || ''
    this.toolRegistry = new AgentToolRegistry(DREAM_TOOLS, { verboseError: true })
  }

  async run(type: string, userMessage: string): Promise<void> {
    if (!userMessage) throw new Error('[DreamAgent] userMessage 不能为空')

    const systemPrompt = await this.buildPrompt(type)

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt + `\n\n项目目录: ${this.workDir}` },
      { role: 'user', content: userMessage },
    ]

    await this.runLoop(messages)
  }

  private async runLoop(messages: ChatMessage[]): Promise<void> {
    const maxIterations = 50
    let iteration = 0
    const toolDefs = await this.toolRegistry.getDefinitions()
    const context = buildToolContext({ sessionId: 'dream-agent', projectPath: this.workDir })

    while (iteration < maxIterations) {
      iteration++
      const response = await this.provider.chat(messages, {
        tools: toolDefs,
        sessionId: 'dream-agent',
        modelName: this.provider.getModel(),
      })

      if (!response.toolCalls || response.toolCalls.length === 0) {
        break
      }

      const toolCalls = AgentToolRegistry.parseToolCalls(response.toolCalls)

      for (const toolCall of toolCalls) {
        const result = await this.toolRegistry.execute(toolCall.name, toolCall.arguments, context)

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
