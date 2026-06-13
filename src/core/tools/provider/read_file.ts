import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { Tool, ToolContext, ToolResult } from '../tool.types.js'
import { readFile } from 'fs/promises'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const read_file_description = fs.readFileSync(path.join(__dirname, 'read_file.txt'), 'utf-8')

const DEFAULT_LIMIT = 2000
const MAX_LINE_LENGTH = 2000

export const readFileTool: Tool = {
  name: 'read_file',
  description: read_file_description,
  parameters: {
    type: 'object',
    properties: {
      file_path: {
        type: 'string',
        description: '文件或目录绝对路径'
      },
      offset: {
        type: 'number',
        description: '起始行号，从1开始（可选，默认 1）'
      },
      limit: {
        type: 'number',
        description: '最大读取行数（可选，默认 2000）'
      }
    },
    required: ['file_path']
  },
  execute: async (params: { file_path: string; offset?: number; limit?: number }, context: ToolContext): Promise<ToolResult> => {
    let { file_path, offset = 1, limit = DEFAULT_LIMIT } = params

    if (!file_path) {
      return {
        success: false,
        output: '',
        error: `Missing required parameter: file_path`
      }
    }

    if (file_path.startsWith('@')) {
      file_path = file_path.substring(1)
    }

    if (!path.isAbsolute(file_path)) {
      file_path = path.resolve(context.workDir || process.cwd(), file_path)
    }

    const stat = await fs.promises.stat(file_path).catch(() => null)
    if (!stat) {
      return { success: false, output: '', error: `File not found: ${file_path}` }
    }

    if (stat.isDirectory()) {
      const entries = await fs.promises.readdir(file_path, { withFileTypes: true })
      const sorted = entries.map(e => ({
        name: e.name + (e.isDirectory() ? '/' : ''),
        isDir: e.isDirectory()
      })).sort((a, b) => {
        if (a.isDir !== b.isDir) return a.isDir ? -1 : 1
        return a.name.localeCompare(b.name)
      })

      const start = Math.max(0, offset - 1)
      const end = Math.min(start + limit, sorted.length)
      const sliced = sorted.slice(start, end)
      const truncated = end < sorted.length

      return {
        success: true,
        output: `<file_path>${file_path}</file_path>\n<type>directory</type>\n<entries>\n${sliced.map(e => e.name).join('\n')}\n</entries>\n${truncated ? `\n(Showing ${sliced.length} of ${sorted.length} entries)` : `(${sorted.length} entries)`}`,
        metadata: { truncated, total: sorted.length }
      }
    }

    const buffer = await readFile(file_path)
    if (buffer[0] === 0 && buffer.length > 1) {
      return { success: false, output: '', error: `Cannot read binary file: ${file_path}` }
    }

    const content = buffer.toString('utf-8').replace(/\r\n/g, '\n')
    const lines = content.split('\n')

    if (offset < 1) offset = 1
    if (offset > lines.length) {
      return { success: false, output: '', error: `Offset ${offset} is out of range (file has ${lines.length} lines)` }
    }

    const start = offset - 1
    const end = Math.min(start + limit, lines.length)
    const selected = lines.slice(start, end)
    const truncated = end < lines.length

    let result = `<file_path>${file_path}</file_path>\n<type>file</type>\n<content>\n`
    for (let i = 0; i < selected.length; i++) {
      const line = selected[i]
      const lineNum = start + i + 1
      if (line.length > MAX_LINE_LENGTH) {
        result += `${lineNum}: ${line.slice(0, MAX_LINE_LENGTH)}  [line truncated]\n`
      } else {
        result += `${lineNum}: ${line}\n`
      }
    }

    if (truncated) {
      result += `\n(Showing lines ${offset}-${end} of ${lines.length}. Use offset=${end + 1} to continue.)`
    } else {
      result += `\n(End of file - total ${lines.length} lines)`
    }
    result += '\n</content>'

    return {
      success: true,
      output: result,
      metadata: { truncated, totalLines: lines.length }
    }
  }
}
