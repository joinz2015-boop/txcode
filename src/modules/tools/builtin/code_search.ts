import { Tool, ToolContext, ToolResult } from '../tool.types.js'

const API_CONFIG = {
  BASE_URL: 'https://mcp.exa.ai',
  ENDPOINTS: {
    CONTEXT: '/mcp',
  },
  DEFAULT_TOKENS: 5000,
  TIMEOUT: 30000,
} as const

interface McpCodeRequest {
  jsonrpc: string
  id: number
  method: string
  params: {
    name: string
    arguments: {
      query: string
      tokensNum: number
    }
  }
}

interface McpCodeResponse {
  jsonrpc: string
  result: {
    content: Array<{
      type: string
      text: string
    }>
  }
}

export const codeSearchTool: Tool = {
  name: 'code_search',
  description: '',
  descriptionFile: 'code_search.txt',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: '搜索查询字符串，用于查找 APIs、库和 SDK 的相关上下文。例如：React useState hook examples、Python pandas dataframe filtering、Express.js middleware'
      },
      tokens: {
        type: 'number',
        description: '返回的 token 数量（可选，1000-50000，默认 5000）。根据需要调整上下文量 - 特定问题用较低值，全面文档用较高值'
      }
    },
    required: ['query']
  },
  execute: async (params: { query: string; tokens?: number }, context: ToolContext): Promise<ToolResult> => {
    const codeRequest: McpCodeRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'get_code_context_exa',
        arguments: {
          query: params.query,
          tokensNum: params.tokens || API_CONFIG.DEFAULT_TOKENS,
        },
      },
    }

    const timeoutTimer = setTimeout(() => {
      throw new Error('Code search request timed out')
    }, API_CONFIG.TIMEOUT)

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CONTEXT}`, {
        method: 'POST',
        headers: {
          accept: 'application/json, text/event-stream',
          'content-type': 'application/json',
        },
        body: JSON.stringify(codeRequest),
        signal: context.abortSignal,
      })

      clearTimeout(timeoutTimer)

      if (!response.ok) {
        const errorText = await response.text()
        return { success: false, output: '', error: `Code search error (${response.status}): ${errorText}` }
      }

      const responseText = await response.text()

      const lines = responseText.split('\n')
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data: McpCodeResponse = JSON.parse(line.substring(6))
          if (data.result && data.result.content && data.result.content.length > 0) {
            return {
              success: true,
              output: data.result.content[0].text,
              metadata: { query: params.query, tokens: params.tokens || API_CONFIG.DEFAULT_TOKENS },
            }
          }
        }
      }

      return {
        success: true,
        output: '未找到代码片段或文档。请尝试其他查询，或更具体地说明库/框架名称。',
      }
    } catch (err: any) {
      clearTimeout(timeoutTimer)
      if (err.message === 'Code search request timed out') {
        return { success: false, output: '', error: '代码搜索请求超时' }
      }
      return { success: false, output: '', error: err.message }
    }
  }
}
