import fs from 'fs'
import path from 'path'
import { Tool, ToolContext, ToolResult } from '../tool.types.js'

export const writeFileTool: Tool = {
  name: 'write_file',
  description: '',
  parameters: {
    type: 'object',
    properties: {
      file_path: {
        type: 'string',
        description: '文件绝对路径'
      },
      content: {
        type: 'string',
        description: '<![CDATA[要写入的内容]]>'
      }
    },
    required: ['file_path', 'content']
  },
  execute: async (params: { file_path: string; content: string }, context: ToolContext): Promise<ToolResult> => {
    let { file_path, content } = params

    if (!file_path) {
      return {
        success: false,
        output: '',
        error: `Missing required parameter: file_path. Available parameters: ${Object.keys(params).join(', ')}`
      }
    }

    if (!content) {
      return {
        success: false,
        output: '',
        error: 'Missing required parameter: content'
      }
    }

    if (file_path.startsWith('@')) {
      file_path = file_path.substring(1)
    }

    if (!path.isAbsolute(file_path)) {
      file_path = path.resolve(context.workDir || process.cwd(), file_path)
    }

    const exists = await fs.promises.access(file_path).then(() => true).catch(() => false)
    if (exists) {
      return {
        success: false,
        output: '',
        error: `File already exists: ${file_path}\n如果要修改已有文件，请使用 edit_file 工具。`
      }
    }

    const dir = path.dirname(file_path)
    await fs.promises.mkdir(dir, { recursive: true })

    await fs.promises.writeFile(file_path, content, 'utf-8')

    return {
      success: true,
      output: `成功: 新文件已创建 ${file_path} (${content.length} 字符)`,
      metadata: { path: file_path, size: content.length }
    }
  }
}
