import fs from 'fs'
import path from 'path'
import { Tool, ToolContext, ToolResult } from '../tool.types.js'

export const editFileTool: Tool = {
  name: 'edit_file',
  description: '',
  descriptionFile: 'edit_file.txt',
  parameters: {
    type: 'object',
    properties: {
      file_path: {
        type: 'string',
        description: '文件绝对路径'
      },
      old_string: {
        type: 'string',
        description: '<![CDATA[要被替换的内容（必须精确匹配）]]>'
      },
      new_string: {
        type: 'string',
        description: '<![CDATA[替换后的新内容]]>'
      },
      replace_all: {
        type: 'boolean',
        description: '是否替换所有匹配项（可选，默认 false）'
      }
    },
    required: ['file_path', 'old_string', 'new_string']
  },
  execute: async (params: { file_path: string; old_string?: string; new_string?: string; replace_all?: boolean }, context: ToolContext): Promise<ToolResult> => {
    const extractCDATA = (str: string | undefined): string => {
      if (!str) return ''
      const cdataMatch = str.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/)
      return cdataMatch ? cdataMatch[1] : str
    }

    const normalizeLineEndings = (str: string): string => {
      return str.replace(/\r\n/g, '\n')
    }

    let { file_path, old_string, new_string, replace_all = false } = params

    old_string = extractCDATA(old_string)
    new_string = extractCDATA(new_string)

    if (!file_path) {
      return {
        success: false,
        output: '',
        error: `Missing required parameter: file_path. Available parameters: ${Object.keys(params).join(', ')}`
      }
    }

    if (!old_string) {
      return {
        success: false,
        output: '',
        error: 'Missing required parameter: old_string'
      }
    }

    if (!new_string) {
      return {
        success: false,
        output: '',
        error: 'Missing required parameter: new_string'
      }
    }

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
    const normalizedContent = normalizeLineEndings(content)
    const normalizedOldString = normalizeLineEndings(old_string)
    const normalizedNewString = normalizeLineEndings(new_string)

    if (!normalizedContent.includes(normalizedOldString)) {
      return { success: false, output: '', error: 'old_string not found in content' }
    }

    let newContent: string
    if (replace_all) {
      newContent = normalizedContent.split(normalizedOldString).join(normalizedNewString)
    } else {
      const firstIndex = normalizedContent.indexOf(normalizedOldString)
      const secondIndex = normalizedContent.indexOf(normalizedOldString, firstIndex + normalizedOldString.length)
      if (secondIndex !== -1) {
        return {
          success: false,
          output: '',
          error: 'Found multiple matches. Use replace_all=true or provide more context to make old_string unique.'
        }
      }
      newContent = normalizedContent.replace(normalizedOldString, normalizedNewString)
    }

    await fs.promises.writeFile(file_path, newContent, 'utf-8')

    const count = replace_all ? (normalizedContent.split(normalizedOldString).length - 1) : 1
    return {
      success: true,
      output: `成功: 文件已更新 ${file_path}${count > 1 ? ` (${count} 处替换)` : ''}`,
      metadata: { path: file_path, replacements: count }
    }
  }
}
