import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { Tool, ToolContext, ToolResult } from '../tool.types.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const grep_description = fs.readFileSync(path.join(__dirname, 'grep.txt'), 'utf-8')

const IGNORE_DIRS = ['node_modules', '.git', 'dist', 'build', '.next', 'coverage', '.cache']
const MAX_RESULTS = 100

function matchGlob(pattern: string, filePath: string): boolean {
  const normalizedPattern = pattern.replace(/\./g, '\\.').replace(/\*/g, '[^/]*').replace(/\?/g, '[^/]')
  const normalizedPath = filePath.replace(/\\/g, '/')
  return new RegExp(`^${normalizedPattern}$`, 'i').test(normalizedPath)
}

export const grepTool: Tool = {
  name: 'grep',
  description: grep_description,
  parameters: {
    type: 'object',
    properties: {
      pattern: {
        type: 'string',
        description: '正则表达式模式'
      },
      directory: {
        type: 'string',
        description: '搜索目录（可选）'
      },
      include: {
        type: 'string',
        description: '文件模式过滤（可选，如 "*.ts"）'
      }
    },
    required: ['pattern']
  },
  execute: async (params: { pattern: string; directory?: string; include?: string }, context: ToolContext): Promise<ToolResult> => {
    const { pattern, directory, include } = params
    const dir = directory ? path.resolve(directory) : (context.workDir || process.cwd())

    let regex: RegExp
    try {
      regex = new RegExp(pattern, 'g')
    } catch {
      return { success: false, output: '', error: `Invalid regex pattern: ${pattern}` }
    }

    const results: { file: string; line: number; content: string }[] = []

    const walk = (currentDir: string) => {
      if (results.length >= MAX_RESULTS) return

      try {
        const entries = fs.readdirSync(currentDir, { withFileTypes: true })

        for (const entry of entries) {
          if (results.length >= MAX_RESULTS) break

          const fullPath = path.join(currentDir, entry.name)

          if (entry.isDirectory()) {
            if (!IGNORE_DIRS.includes(entry.name) && !entry.name.startsWith('.')) {
              walk(fullPath)
            }
          } else {
            const relativePath = path.relative(dir, fullPath).replace(/\\/g, '/')

            if (include && !matchGlob(include, relativePath) && !matchGlob(include, entry.name)) {
              continue
            }

            try {
              const content = fs.readFileSync(fullPath, 'utf-8')
              const lines = content.split('\n')

              for (let i = 0; i < lines.length && results.length < MAX_RESULTS; i++) {
                regex.lastIndex = 0
                if (regex.test(lines[i])) {
                  results.push({
                    file: relativePath,
                    line: i + 1,
                    content: lines[i].trim().slice(0, 200)
                  })
                }
              }
            } catch {}
          }
        }
      } catch {}
    }

    walk(dir)

    if (results.length === 0) {
      return { success: true, output: `No matches found: ${pattern}`, metadata: { pattern, directory: dir } }
    }

    const output = `Found ${results.length} matches:\n${results.map(r => `${r.file}:${r.line}: ${r.content}`).join('\n')}`

    return {
      success: true,
      output,
      metadata: { total: results.length, pattern, directory: dir }
    }
  }
}
