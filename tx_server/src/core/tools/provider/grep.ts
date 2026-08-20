import fs from 'fs'
import path from 'path'
import { execFile } from 'child_process'
import { Tool, ToolContext, ToolResult } from '../tool.types.js'

const currentDir = import.meta.dirname
const grep_description = fs.readFileSync(path.join(currentDir, 'grep.txt'), 'utf-8')

const IGNORE_DIRS = ['node_modules', '.git', 'dist', 'build', '.next', 'coverage', '.cache']
const MAX_RESULTS = 100
const ASYNC_CONCURRENCY = 20

function matchGlob(pattern: string, filePath: string): boolean {
  const normalizedPattern = pattern.replace(/\./g, '\\.').replace(/\*/g, '[^/]*').replace(/\?/g, '[^/]')
  const normalizedPath = filePath.replace(/\\/g, '/')
  return new RegExp(`^${normalizedPattern}$`, 'i').test(normalizedPath)
}

let rgAvailable: boolean | null = null

async function checkRgAvailable(): Promise<boolean> {
  if (rgAvailable !== null) return rgAvailable
  try {
    await new Promise<void>((resolve, reject) => {
      execFile('rg', ['--version'], { timeout: 3000 }, (err) => {
        err ? reject(err) : resolve()
      })
    })
    rgAvailable = true
  } catch {
    rgAvailable = false
  }
  return rgAvailable
}

function searchWithRg(
  pattern: string,
  directory: string,
  include?: string
): Promise<ToolResult> {
  const args = ['--no-heading', '--line-number', '--max-count', String(MAX_RESULTS)]

  if (include) {
    args.push('--glob', include)
  }
  for (const d of IGNORE_DIRS) {
    args.push('--glob', `!${d}/**`)
  }
  args.push('--', pattern, '.')

  return new Promise((resolve) => {
    execFile('rg', args, {
      cwd: directory,
      timeout: 30000,
      maxBuffer: 10 * 1024 * 1024,
    }, (err, stdout) => {
      if (err && err.code !== 1) {
        resolve({ success: false, output: '', error: `rg failed: ${err.message}` })
        return
      }

      const lines = stdout.trim().split('\n').filter(Boolean)
      if (lines.length === 0) {
        resolve({
          success: true,
          output: `No matches found: ${pattern}`,
          metadata: { pattern, directory },
        })
        return
      }

      const results = lines.slice(0, MAX_RESULTS).map(line => {
        const idx1 = line.indexOf(':')
        const idx2 = line.indexOf(':', idx1 + 1)
        return {
          file: line.slice(0, idx1).replace(/\\/g, '/'),
          line: parseInt(line.slice(idx1 + 1, idx2), 10) || 1,
          content: line.slice(idx2 + 1).trim().slice(0, 200),
        }
      })

      const output = `Found ${results.length} matches:\n${results.map(r => `${r.file}:${r.line}: ${r.content}`).join('\n')}`
      resolve({
        success: true,
        output,
        metadata: { total: results.length, pattern, directory },
      })
    })
  })
}

async function searchWithWalk(
  pattern: string,
  directory: string,
  include?: string
): Promise<ToolResult> {
  const results: { file: string; line: number; content: string }[] = []
  const filePaths: string[] = []

  const collectFiles = async (currentDir: string): Promise<void> => {
    try {
      const entries = await fs.promises.readdir(currentDir, { withFileTypes: true })
      for (const entry of entries) {
        if (results.length >= MAX_RESULTS) return
        const fullPath = path.join(currentDir, entry.name)
        if (entry.isDirectory()) {
          if (!IGNORE_DIRS.includes(entry.name) && !entry.name.startsWith('.')) {
            await collectFiles(fullPath)
          }
        } else {
          const relPath = path.relative(directory, fullPath).replace(/\\/g, '/')
          if (include && !matchGlob(include, relPath) && !matchGlob(include, entry.name)) {
            continue
          }
          filePaths.push(fullPath)
        }
      }
    } catch {}
  }

  await collectFiles(directory)

  for (let i = 0; i < filePaths.length && results.length < MAX_RESULTS; i += ASYNC_CONCURRENCY) {
    const batch = filePaths.slice(i, i + ASYNC_CONCURRENCY)
    await Promise.all(batch.map(async (filePath) => {
      if (results.length >= MAX_RESULTS) return
      try {
        const content = await fs.promises.readFile(filePath, 'utf-8')
        const regex = new RegExp(pattern, 'g')
        const lines = content.split('\n')
        const relPath = path.relative(directory, filePath).replace(/\\/g, '/')
        for (let j = 0; j < lines.length && results.length < MAX_RESULTS; j++) {
          regex.lastIndex = 0
          if (regex.test(lines[j])) {
            results.push({
              file: relPath,
              line: j + 1,
              content: lines[j].trim().slice(0, 200),
            })
          }
        }
      } catch {}
    }))
  }

  results.length = Math.min(results.length, MAX_RESULTS)

  if (results.length === 0) {
    return {
      success: true,
      output: `No matches found: ${pattern}`,
      metadata: { pattern, directory },
    }
  }

  const output = `Found ${results.length} matches:\n${results.map(r => `${r.file}:${r.line}: ${r.content}`).join('\n')}`
  return {
    success: true,
    output,
    metadata: { total: results.length, pattern, directory },
  }
}

export const grepTool: Tool = {
  name: 'grep',
  description: grep_description,
  parameters: {
    type: 'object',
    properties: {
      pattern: {
        type: 'string',
        description: '正则表达式模式',
      },
      directory: {
        type: 'string',
        description: '搜索目录（可选）',
      },
      include: {
        type: 'string',
        description: '文件模式过滤（可选，如 "*.ts"）',
      },
    },
    required: ['pattern'],
  },
  execute: async (params: { pattern: string; directory?: string; include?: string }, context: ToolContext): Promise<ToolResult> => {
    const { pattern, directory, include } = params
    const dir = directory ? path.resolve(directory) : (context.workDir || process.cwd())

    try {
      new RegExp(pattern)
    } catch {
      return { success: false, output: '', error: `Invalid regex pattern: ${pattern}` }
    }

    if (await checkRgAvailable()) {
      const result = await searchWithRg(pattern, dir, include)
      if (result.success) return result
      return await searchWithWalk(pattern, dir, include)
    }

    return await searchWithWalk(pattern, dir, include)
  },
}
