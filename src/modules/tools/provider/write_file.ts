import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { Tool, ToolContext, ToolResult } from '../tool.types.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const write_file_description = fs.readFileSync(path.join(__dirname, 'write_file.txt'), 'utf-8')

export const writeFileTool: Tool = {
  name: 'write_file',
  description: write_file_description,
  parameters: {
    type: 'object',
    properties: {
      file_path: {
        type: 'string',
        description: '文件绝对路径'
      },
      content: {
        type: 'string',
        description: '要写入文件的内容'
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
        error: `Missing required parameter: file_path`
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
        error: `File already exists: ${file_path}\nUse edit_file to modify existing files.`
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
