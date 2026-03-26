/**
 * 内置工具导出
 */

import { Tool } from '../tool.types.js'
import { bashTool } from './bash.js'
import { readFileTool } from './read_file.js'
import { writeFileTool } from './write_file.js'
import { editFileTool } from './edit_file.js'
import { globTool } from './glob.js'
import { grepTool } from './grep.js'
import { todoReadTool } from './todo_read.js'
import { todoWriteTool } from './todo_write.js'
import { lspTool } from './lsp.js'
import { webSearchTool } from './web_search.js'
import { webFetchTool } from './web_fetch.js'
import { codeSearchTool } from './code_search.js'
import { memoryTool } from './memory.js'
import { skillTool } from '../../skill/skill.tool.js'

import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const DESCRIPTIONS_DIR = path.dirname(__filename)

async function loadDescription(filePath: string): Promise<string> {
  try {
    return await fs.readFile(filePath, 'utf-8')
  } catch {
    return ''
  }
}

async function withDescriptions(tools: Tool[]): Promise<Tool[]> {
  const results: Tool[] = []
  for (const tool of tools) {
    if (tool.descriptionFile) {
      let descPath: string
      if (tool.name === 'skill') {
        descPath = path.join(DESCRIPTIONS_DIR, '..', '..', 'skill', 'skill.txt')
      } else {
        descPath = path.isAbsolute(tool.descriptionFile)
          ? tool.descriptionFile
          : path.join(DESCRIPTIONS_DIR, tool.descriptionFile)
      }
      const desc = await loadDescription(descPath)
      results.push({ ...tool, description: desc })
    } else {
      results.push(tool)
    }
  }
  return results
}

export async function getBuiltinTools(): Promise<Tool[]> {
  const tools = [
    bashTool,
    readFileTool,
    writeFileTool,
    editFileTool,
    globTool,
    grepTool,
    todoReadTool,
    todoWriteTool,
    lspTool,
    webSearchTool,
    webFetchTool,
    codeSearchTool,
    memoryTool,
    skillTool,
  ]
  return withDescriptions(tools)
}

let _builtinTools: Tool[] | null = null

export async function getBuiltinToolsInstance(): Promise<Tool[]> {
  if (!_builtinTools) {
    _builtinTools = await getBuiltinTools()
  }
  return _builtinTools
}

export const builtinTools: Tool[] = []
