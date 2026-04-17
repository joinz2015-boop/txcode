import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { Tool, ToolContext, ToolResult } from '../tool.types.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const memory_description = fs.readFileSync(path.join(__dirname, 'memory.txt'), 'utf-8')

const MEMORY_FILE = 'MEMORY.md'
const MEMORY_LIMIT = 2200
const ENTRY_SEPARATOR = '\n§\n'

export function getMemoryPath(workDir: string): string {
  return path.join(workDir, '.txcode', 'memory', MEMORY_FILE)
}

export function loadMemory(workDir: string): string | null {
  const memoryPath = getMemoryPath(workDir)
  if (!fs.existsSync(memoryPath)) return null
  return fs.readFileSync(memoryPath, 'utf-8')
}

export function ensureMemoryDir(workDir: string): void {
  const memoryDir = path.join(workDir, '.txcode', 'memory')
  if (!fs.existsSync(memoryDir)) {
    fs.mkdirSync(memoryDir, { recursive: true })
  }
}

function parseEntries(content: string): string[] {
  if (!content || !content.includes(ENTRY_SEPARATOR)) {
    return content ? [content] : []
  }
  return content.split(ENTRY_SEPARATOR).filter(e => e.trim())
}

function renderEntries(entries: string[]): string {
  return entries.map(e => e.trim()).join(ENTRY_SEPARATOR)
}

function saveMemory(workDir: string, content: string): string {
  ensureMemoryDir(workDir)
  const memoryPath = getMemoryPath(workDir)
  const tempPath = memoryPath + '.tmp'
  
  let finalContent = content
  if (content.length > MEMORY_LIMIT) {
    finalContent = content.slice(0, MEMORY_LIMIT)
  }
  
  fs.writeFileSync(tempPath, finalContent, 'utf-8')
  fs.renameSync(tempPath, memoryPath)
  return finalContent
}

function sanitizeContext(content: string): string {
  return `<memory-context>\n${content}\n</memory-context>`
}

interface MemoryEntry {
  content: string
}

export const memoryTool: Tool = {
  name: 'memory',
  description: memory_description,
  parameters: {
    type: 'object',
    properties: {
      action: { type: 'string', enum: ['add', 'replace', 'remove', 'list'] },
      content: { type: 'string', description: '条目内容 (add/replace 必须)' },
      old_text: { type: 'string', description: '要替换/删除的条目标识' },
    },
    required: ['action'],
  },
  execute: async (params: { action?: string; content?: string; old_text?: string }, context: ToolContext): Promise<ToolResult> => {
    const workDir = context.workDir || process.cwd()
    const action = params.action || 'list'
    
    const memoryPath = getMemoryPath(workDir)
    const currentContent = loadMemory(workDir) || ''
    const entries = parseEntries(currentContent)

    if (action === 'list') {
      if (entries.length === 0) {
        return {
          success: true,
          output: 'No memories found.',
          metadata: { count: 0 }
        }
      }

      let output = `Memory list (${entries.length} total):\n`
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i].replace(/^#.*\n/, '').trim()
        const preview = entry.length > 60 ? entry.slice(0, 60) + '...' : entry
        output += `\n${i + 1}. ${preview}`
      }
      output += `\n\nTotal characters: ${currentContent.length}/${MEMORY_LIMIT}`

      return {
        success: true,
        output,
        metadata: { count: entries.length, entries }
      }
    }

    if (action === 'add') {
      if (!params.content) {
        return { success: false, output: '', error: 'content required for add action' }
      }

      const newContent = currentContent 
        ? currentContent + ENTRY_SEPARATOR + params.content 
        : params.content
      
      if (newContent.length > MEMORY_LIMIT) {
        return { 
          success: false, 
          output: '', 
          error: `Memory exceeds ${MEMORY_LIMIT} character limit. Current: ${currentContent.length}, New would be: ${newContent.length}. Please reduce content or remove old entries first.` 
        }
      }
      
      saveMemory(workDir, newContent)
      
      return {
        success: true,
        output: `Memory added. Total: ${newContent.length}/${MEMORY_LIMIT}`,
        metadata: { saved: newContent.length }
      }
    }

    if (action === 'replace') {
      if (!params.old_text || !params.content) {
        return { success: false, output: '', error: 'old_text and content required for replace action' }
      }

      const oldText = params.old_text.trim()
      const idx = entries.findIndex(e => e.includes(oldText))
      
      if (idx === -1) {
        return { success: false, output: '', error: 'Entry not found' }
      }

      entries[idx] = params.content
      const newContent = renderEntries(entries)
      const saved = saveMemory(workDir, newContent)

      return {
        success: true,
        output: `Memory replaced. Total: ${saved.length}/${MEMORY_LIMIT}`,
        metadata: { saved: saved.length }
      }
    }

    if (action === 'remove') {
      if (!params.old_text) {
        return { success: false, output: '', error: 'old_text required for remove action' }
      }

      const oldText = params.old_text.trim()
      const filtered = entries.filter(e => !e.includes(oldText))
      
      if (filtered.length === entries.length) {
        return { success: false, output: '', error: 'Entry not found' }
      }

      const newContent = renderEntries(filtered)
      const saved = saveMemory(workDir, newContent)

      return {
        success: true,
        output: `Memory removed. Total: ${saved.length}/${MEMORY_LIMIT}`,
        metadata: { saved: saved.length }
      }
    }

    return { success: false, output: '', error: 'Unknown action' }
  }
}
