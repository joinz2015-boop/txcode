import fs from 'fs'
import path from 'path'
import { Tool, ToolContext, ToolResult } from '../tool.types.js'

const IGNORE_DIRS = ['node_modules', '.git', 'dist', 'build', '.next', 'coverage', '.cache', '__pycache__']

function matchGlob(pattern: string, filePath: string): boolean {
  const normalizedPattern = pattern.replace(/\\/g, '/')
  const normalizedPath = filePath.replace(/\\/g, '/')

  const regexStr = normalizedPattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '<<DOUBLESTAR>>')
    .replace(/\*/g, '[^/]*')
    .replace(/<<DOUBLESTAR>>/g, '.*')
    .replace(/\?/g, '[^/]')

  const regex = new RegExp(`^${regexStr}$`, 'i')
  return regex.test(normalizedPath)
}

function glob(pattern: string, dir: string): string[] {
  const results: string[] = []

  const walk = (currentDir: string) => {
    try {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true })

      for (const entry of entries) {
        if (entry.isDirectory()) {
          if (!IGNORE_DIRS.includes(entry.name) && !entry.name.startsWith('.')) {
            const fullPath = path.join(currentDir, entry.name)
            const relativePath = path.relative(dir, fullPath).replace(/\\/g, '/')

            if (matchGlob(pattern, relativePath) || matchGlob(pattern, entry.name)) {
              results.push(relativePath)
            }
            walk(fullPath)
          }
        } else {
          const fullPath = path.join(currentDir, entry.name)
          const relativePath = path.relative(dir, fullPath).replace(/\\/g, '/')

          if (matchGlob(pattern, relativePath) || matchGlob(pattern, entry.name)) {
            results.push(relativePath)
          }
        }
      }
    } catch {}
  }

  walk(dir)
  return results.sort()
}

export const globTool: Tool = {
  name: 'glob',
  description: '',
  descriptionFile: 'glob.txt',
  parameters: {
    type: 'object',
    properties: {
      pattern: {
        type: 'string',
        description: 'glob 模式，如 "**/*.ts" 匹配所有 ts 文件'
      },
      directory: {
        type: 'string',
        description: '搜索目录的绝对路径（可选，默认当前工作目录）'
      }
    },
    required: ['pattern']
  },
  execute: async (params: { pattern: string; directory?: string }, context: ToolContext): Promise<ToolResult> => {
    const { pattern, directory } = params
    const dir = directory ? path.resolve(directory) : (context.workDir || process.cwd())

    const exists = await fs.promises.access(dir).then(() => true).catch(() => false)
    if (!exists) {
      return { success: false, output: '', error: `Directory not found: ${dir}` }
    }

    const results = glob(pattern, dir)

    if (results.length === 0) {
      return { success: true, output: `未找到匹配文件: ${pattern}\n搜索目录: ${dir}` }
    }

    const maxShow = 100
    const shown = results.length > maxShow ? results.slice(0, maxShow) : results
    const output = `找到 ${results.length} 个文件${results.length > maxShow ? `（显示前 ${maxShow} 个）` : ''}:\n${shown.join('\n')}\n\n搜索目录: ${dir}${results.length > maxShow ? `\n... 还有 ${results.length - maxShow} 个文件` : ''}`

    return {
      success: true,
      output,
      metadata: { total: results.length, pattern, directory: dir }
    }
  }
}
