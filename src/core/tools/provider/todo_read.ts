import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { Tool, ToolContext, ToolResult } from '../tool.types.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const todo_read_description = fs.readFileSync(path.join(__dirname, 'todo_read.txt'), 'utf-8')

const todoStore = new Map<string, { content: string; status: string; priority: string }[]>()

export const todoReadTool: Tool = {
  name: 'todoread',
  description: todo_read_description,
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
