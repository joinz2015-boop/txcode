import fs from 'fs'
import path from 'path'
import { Tool, ToolContext, ToolResult } from '../tool.types.js'

export const editFileTool: Tool = {
  name: 'edit_file',
  description: '',
  parameters: {
    type: 'object',
    properties: {
      file_path: {
        type: 'string',
        description: '文件绝对路径'
      },
      old_string: {
        type: 'string',
        description: '要被替换的内容（必须精确匹配）'
      },
      new_string: {
        type: 'string',
        description: '替换后的新内容'
      },
      replace_all: {
        type: 'boolean',
        description: '是否替换所有匹配项（可选，默认 false）'
      }
    },
    required: ['file_path', 'old_string', 'new_string']
  },
  execute: async (params: { file_path: string; old_string: string; new_string: string; replace_all?: boolean }, context: ToolContext): Promise<ToolResult> => {
    let { file_path, old_string, new_string, replace_all = false } = params

    if (file_path.startsWith('@')) {
      file_path = file_path.substring(1)
    }

    if (!path.isAbsolute(file_path)) {
      file_path = path.resolve(context.workDir || process.cwd(), file_path)
    }

    const exists = await fs.promises.access(file_path).then(() => true).catch(() => false)
    if (!exists) {
      return { success: false, output: '', error: `File not found: ${file_path}` }
    }

    const content = await fs.promises.readFile(file_path, 'utf-8')

    if (!content.includes(old_string)) {
      return { success: false, output: '', error: 'old_string not found in content' }
    }

    let newContent: string
    if (replace_all) {
      newContent = content.split(old_string).join(new_string)
    } else {
      const firstIndex = content.indexOf(old_string)
      const secondIndex = content.indexOf(old_string, firstIndex + old_string.length)
      if (secondIndex !== -1) {
        return {
          success: false,
          output: '',
          error: 'Found multiple matches. Use replace_all=true or provide more context to make old_string unique.'
        }
      }
      newContent = content.replace(old_string, new_string)
    }

    await fs.promises.writeFile(file_path, newContent, 'utf-8')

    const count = replace_all ? (content.split(old_string).length - 1) : 1
    return {
      success: true,
      output: `成功: 文件已更新 ${file_path}${count > 1 ? ` (${count} 处替换)` : ''}`,
      metadata: { path: file_path, replacements: count }
    }
  }
}
