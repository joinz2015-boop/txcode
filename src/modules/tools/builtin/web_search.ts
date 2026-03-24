import { Tool, ToolContext, ToolResult } from '../tool.types.js'

const API_CONFIG = {
  BASE_URL: 'https://mcp.exa.ai',
  ENDPOINTS: {
    SEARCH: '/mcp',
  },
  DEFAULT_NUM_RESULTS: 8,
  TIMEOUT: 25000,
} as const

interface McpSearchRequest {
  jsonrpc: string
  id: number
  method: string
  params: {
    name: string
    arguments: {
      query: string
      numResults?: number
      livecrawl?: 'fallback' | 'preferred'
      type?: 'auto' | 'fast' | 'deep'
      contextMaxCharacters?: number
    }
  }
}

interface McpSearchResponse {
  jsonrpc: string
  result: {
    content: Array<{
      type: string
      text: string
    }>
  }
}

export const webSearchTool: Tool = {
  name: 'web_search',
  description: '',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: '搜索查询字符串'
      },
      numResults: {
        type: 'number',
        description: '返回结果数量（可选，默认 8）'
      },
      livecrawl: {
        type: 'string',
        enum: ['fallback', 'preferred'],
        description: '实时爬取模式 - fallback: 缓存不可用时备用; preferred: 优先实时爬取（默认: fallback）'
      },
      type: {
        type: 'string',
        enum: ['auto', 'fast', 'deep'],
        description: '搜索类型 - auto: 平衡搜索; fast: 快速结果; deep: 全面搜索（默认: auto）'
      },
      contextMaxCharacters: {
        type: 'number',
        description: 'LLM 上下文最大字符数（可选，默认 10000）'
      }
    },
    required: ['query']
  },
  execute: async (params: {
    query: string
    numResults?: number
    livecrawl?: 'fallback' | 'preferred'
    type?: 'auto' | 'fast' | 'deep'
    contextMaxCharacters?: number
  }, context: ToolContext): Promise<ToolResult> => {
    const searchRequest: McpSearchRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'web_search_exa',
        arguments: {
          query: params.query,
          type: params.type || 'auto',
          numResults: params.numResults || API_CONFIG.DEFAULT_NUM_RESULTS,
          livecrawl: params.livecrawl || 'fallback',
          contextMaxCharacters: params.contextMaxCharacters,
        },
      },
    }

    const timeoutTimer = setTimeout(() => {
      throw new Error('Search request timed out')
    }, API_CONFIG.TIMEOUT)

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.SEARCH}`, {
        method: 'POST',
        headers: {
          accept: 'application/json, text/event-stream',
          'content-type': 'application/json',
        },
        body: JSON.stringify(searchRequest),
        signal: context.abortSignal,
      })

      clearTimeout(timeoutTimer)

      if (!response.ok) {
        const errorText = await response.text()
        return { success: false, output: '', error: `Search error (${response.status}): ${errorText}` }
      }

      const responseText = await response.text()

      const lines = responseText.split('\n')
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data: McpSearchResponse = JSON.parse(line.substring(6))
          if (data.result && data.result.content && data.result.content.length > 0) {
            return {
              success: true,
              output: data.result.content[0].text,
              metadata: { query: params.query, numResults: params.numResults || API_CONFIG.DEFAULT_NUM_RESULTS },
            }
          }
        }
      }

      return { success: true, output: '未找到搜索结果，请尝试其他查询。' }
    } catch (err: any) {
      clearTimeout(timeoutTimer)
      if (err.message === 'Search request timed out') {
        return { success: false, output: '', error: '搜索请求超时' }
      }
      return { success: false, output: '', error: err.message }
    }
  }
}
