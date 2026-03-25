/**
 * TodoRead 工具 - 读取任务列表
 */

import { Tool, ToolContext, ToolResult } from '../tool.types.js'

const todoStore = new Map<string, { content: string; status: string; priority: string }[]>()

export const todoReadTool: Tool = {
  name: 'todoread',
  description: '',
  parameters: {
    type: 'object',
    properties: {}
  },
  execute: async (_params: Record<string, never>, context: ToolContext): Promise<ToolResult> => {
    const todos = todoStore.get(context.sessionId) || []

    if (todos.length === 0) {
      return { success: true, output: '[]', metadata: { total: 0, todos: [] } }
    }

    return {
      success: true,
      output: JSON.stringify(todos, null, 2),
      metadata: { total: todos.length, todos }
    }
  }
}
