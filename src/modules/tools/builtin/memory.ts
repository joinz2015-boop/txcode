import fs from 'fs'
import path from 'path'
import { Tool, ToolContext, ToolResult } from '../tool.types.js'

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
  description: '',
  descriptionFile: 'memory.txt',
  parameters: {
    type: 'object',
    properties: {},
    required: []
  },
  execute: async (params: {}, context: ToolContext): Promise<ToolResult> => {
    const memoryDir = path.join(context.workDir || process.cwd(), '.txcode', 'memory')

    const dirExists = fs.existsSync(memoryDir)
    if (!dirExists) {
      return {
        success: true,
        output: '记忆列表 (共 0 个):\n\n暂无记忆，请使用 write_file 在 .txcode/memory/ 目录下创建第一个记忆文件。\n\n记忆文件命名格式: {序号}-{名称}.md，如 01-项目架构.md',
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
        output: '记忆列表 (共 0 个):\n\n暂无记忆，请使用 write_file 在 .txcode/memory/ 目录下创建第一个记忆文件。',
        metadata: { count: 0 }
      }
    }

    let output = `记忆列表 (共 ${memories.length} 个):\n`

    const relativeBase = path.join('.txcode', 'memory')
    for (let i = 0; i < memories.length; i++) {
      const m = memories[i]
      const relPath = path.relative(context.workDir || process.cwd(), m.path)
      output += `\n${i + 1}. [${m.id}] ${m.name} - 描述:${m.description} - updated:${m.updated}`
      output += `\n   路径: ${relPath}`
    }

    output += `\n\n要读取记忆内容，请使用 read_file 工具读取上述路径。`

    return {
      success: true,
      output,
      metadata: { count: memories.length, memories }
    }
  }
}