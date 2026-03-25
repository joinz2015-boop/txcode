/**
 * TodoWrite 工具 - 写入任务列表
 */

import { Tool, ToolContext, ToolResult } from '../tool.types.js'

const todoStore = new Map<string, { content: string; status: string; priority: string }[]>()

interface TodoItem {
  content: string
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  priority: 'high' | 'medium' | 'low'
}

export const todoWriteTool: Tool = {
  name: 'todowrite',
  description: '',
  parameters: {
    type: 'object',
    properties: {
      todos: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            content: { type: 'string' },
            status: { type: 'string', enum: ['pending', 'in_progress', 'completed', 'cancelled'] },
            priority: { type: 'string', enum: ['high', 'medium', 'low'] }
          },
          required: ['content', 'status', 'priority']
        }
      }
    },
    required: ['todos']
  },
  execute: async (params: { todos: TodoItem[] }, context: ToolContext): Promise<ToolResult> => {
    const validStatuses = ['pending', 'in_progress', 'completed', 'cancelled']
    const validPriorities = ['high', 'medium', 'low']

    for (const todo of params.todos) {
      if (!validStatuses.includes(todo.status)) {
        return { success: false, output: '', error: `Invalid status: ${todo.status}` }
      }
      if (!validPriorities.includes(todo.priority)) {
        return { success: false, output: '', error: `Invalid priority: ${todo.priority}` }
      }
    }

    todoStore.set(context.sessionId, params.todos)

    return {
      success: true,
      output: `已更新 ${params.todos.length} 个任务`,
      metadata: { total: params.todos.length, todos: params.todos }
    }
  }
}
