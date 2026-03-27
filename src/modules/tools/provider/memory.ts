import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { Tool, ToolContext, ToolResult } from '../tool.types.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const memory_description = fs.readFileSync(path.join(__dirname, 'memory.txt'), 'utf-8')

interface MemoryInfo {
  id: string
  name: string
  description: string
  updated: string
  path: string
}

function parseMemoryFile(filePath: string, fileName: string): MemoryInfo | null {
  const match = fileName.match(/^(\d{2})-(.+)\.md$/)
  if (!match) return null

  const id = match[1]
  const name = match[2].replace(/-/g, ' ')

  const content = fs.readFileSync(filePath, 'utf-8')
  const frontMatterMatch = content.match(/^---\n([\s\S]*?)\n---/)

  let description = ''
  let updated = ''

  if (frontMatterMatch) {
    const frontMatter = frontMatterMatch[1]
    const descMatch = frontMatter.match(/description:\s*(.+)/)
    const updatedMatch = frontMatter.match(/updated:\s*(.+)/)

    if (descMatch) description = descMatch[1].trim()
    if (updatedMatch) updated = updatedMatch[1].trim()
  }

  return { id, name, description, updated, path: filePath }
}

export const memoryTool: Tool = {
  name: 'memory',
  description: memory_description,
  parameters: {
    type: 'object',
    properties: {},
  },
  execute: async (params: {}, context: ToolContext): Promise<ToolResult> => {
    const memoryDir = path.join(context.workDir || process.cwd(), '.txcode', 'memory')

    const dirExists = fs.existsSync(memoryDir)
    if (!dirExists) {
      return {
        success: true,
        output: 'No memories found. Create your first memory using write_file in .txcode/memory/ directory.\n\nFile naming format: {number}-{name}.md, e.g., 01-project-architecture.md',
        metadata: { count: 0 }
      }
    }

    const files = fs.readdirSync(memoryDir)
      .filter(f => f.endsWith('.md'))
      .sort()

    const memories: MemoryInfo[] = []

    for (const file of files) {
      const filePath = path.join(memoryDir, file)
      const info = parseMemoryFile(filePath, file)
      if (info) {
        memories.push(info)
      }
    }

    if (memories.length === 0) {
      return {
        success: true,
        output: 'No memories found. Create your first memory using write_file in .txcode/memory/ directory.',
        metadata: { count: 0 }
      }
    }

    let output = `Memory list (${memories.length} total):\n`

    const relativeBase = path.join('.txcode', 'memory')
    for (let i = 0; i < memories.length; i++) {
      const m = memories[i]
      const relPath = path.relative(context.workDir || process.cwd(), m.path)
      output += `\n${i + 1}. [${m.id}] ${m.name}`
      if (m.description) output += ` - ${m.description}`
      output += `\n   Path: ${relPath}`
    }

    output += `\n\nUse read_file to view memory content.`

    return {
      success: true,
      output,
      metadata: { count: memories.length, memories }
    }
  }
}
