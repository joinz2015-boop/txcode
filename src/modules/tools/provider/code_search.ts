import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { Tool, ToolContext, ToolResult } from '../tool.types.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const code_search_description = fs.readFileSync(path.join(__dirname, 'code_search.txt'), 'utf-8')

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
  description: code_search_description,
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: '搜索查询字符串，用于查找 APIs、库和 SDK 的相关上下文'
      },
      tokens: {
        type: 'number',
        description: '返回的 token 数量（可选，1000-50000，默认 5000）'
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
        output: 'No code snippets found. Try a different query or be more specific about the library/framework.',
      }
    } catch (err: any) {
      clearTimeout(timeoutTimer)
      if (err.message === 'Code search request timed out') {
        return { success: false, output: '', error: 'Code search request timed out' }
      }
      return { success: false, output: '', error: err.message }
    }
  }
}
