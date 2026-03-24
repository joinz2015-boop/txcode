import { Tool, ToolContext, ToolResult } from '../tool.types.js'

export const webFetchTool: Tool = {
  name: 'web_fetch',
  description: '',
  parameters: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: '要获取的 URL（必须是完整格式）'
      },
      format: {
        type: 'string',
        enum: ['markdown', 'text', 'html'],
        description: '输出格式（可选，默认 markdown）'
      }
    },
    required: ['url']
  },
  execute: async (params: { url: string; format?: string }, context: ToolContext): Promise<ToolResult> => {
    const { url, format = 'markdown' } = params

    let normalizedUrl = url
    if (url.startsWith('http://')) {
      normalizedUrl = 'https://' + url.slice(7)
    } else if (!url.startsWith('https://')) {
      return { success: false, output: '', error: 'URL must start with http:// or https://' }
    }

    try {
      const response = await fetch(normalizedUrl, {
        signal: context.abortSignal,
        headers: { 'User-Agent': 'Mozilla/5.0' }
      })

      if (!response.ok) {
        return { success: false, output: '', error: `HTTP ${response.status}: ${response.statusText}` }
      }

      const text = await response.text()

      if (format === 'text') {
        return { success: true, output: text.slice(0, 50000), metadata: { url: normalizedUrl, format, length: text.length } }
      }

      return {
        success: true,
        output: `[Web Fetch] URL: ${normalizedUrl}\n[Format: ${format}]\n\n${text.slice(0, 50000)}${text.length > 50000 ? '\n\n[content truncated - exceeded 50000 characters]' : ''}`,
        metadata: { url: normalizedUrl, format, length: text.length }
      }
    } catch (err: any) {
      return { success: false, output: '', error: err.message }
    }
  }
}
