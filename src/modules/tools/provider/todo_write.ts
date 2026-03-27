import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { Tool, ToolContext, ToolResult } from '../tool.types.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const todo_write_description = fs.readFileSync(path.join(__dirname, 'todo_write.txt'), 'utf-8')

const todoStore = new Map<string, { content: string; status: string; priority: string }[]>()

interface TodoItem {
  content: string
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  priority: 'high' | 'medium' | 'low'
}

export const todoWriteTool: Tool = {
  name: 'todowrite',
  description: todo_write_description,
  parameters: {
    type: 'object',
    properties: {
      todos: {
        type: 'array',
        description: '任务数组',
        items: {
          type: 'object',
          description: '任务对象',
          properties: {
            content: { type: 'string', description: '任务内容' },
            status: { type: 'string', enum: ['pending', 'in_progress', 'completed', 'cancelled'], description: '任务状态' },
            priority: { type: 'string', enum: ['high', 'medium', 'low'], description: '优先级' }
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
      output: `Updated ${params.todos.length} tasks`,
      metadata: { total: params.todos.length, todos: params.todos }
    }
  }
}
