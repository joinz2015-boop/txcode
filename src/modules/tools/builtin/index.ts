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

async function loadDescription(filename: string, baseDir?: string): Promise<string> {
  try {
    const dir = baseDir || DESCRIPTIONS_DIR
    return await fs.readFile(path.join(dir, filename), 'utf-8')
  } catch {
    return ''
  }
}

export async function getBuiltinTools(): Promise<Tool[]> {
  const [bashDesc, readFileDesc, writeFileDesc, editFileDesc, globDesc, grepDesc, todoReadDesc, todoWriteDesc, lspDesc, webSearchDesc, webFetchDesc, codeSearchDesc, memoryDesc] = await Promise.all([
    loadDescription('bash.txt'),
    loadDescription('read_file.txt'),
    loadDescription('write_file.txt'),
    loadDescription('edit_file.txt'),
    loadDescription('glob.txt'),
    loadDescription('grep.txt'),
    loadDescription('todo_read.txt'),
    loadDescription('todo_write.txt'),
    loadDescription('lsp.txt'),
    loadDescription('web_search.txt'),
    loadDescription('web_fetch.txt'),
    loadDescription('code_search.txt'),
    loadDescription('memory.txt'),
  ])

  const skillDesc = await loadDescription('skill.txt', path.join(DESCRIPTIONS_DIR, '..', '..', 'skill'))

  bashTool.description = bashDesc
  readFileTool.description = readFileDesc
  writeFileTool.description = writeFileDesc
  editFileTool.description = editFileDesc
  globTool.description = globDesc
  grepTool.description = grepDesc
  todoReadTool.description = todoReadDesc
  todoWriteTool.description = todoWriteDesc
  lspTool.description = lspDesc
  webSearchTool.description = webSearchDesc
  webFetchTool.description = webFetchDesc
  codeSearchTool.description = codeSearchDesc
  memoryTool.description = memoryDesc
  skillTool.description = skillDesc

  return [
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
}

let _builtinTools: Tool[] | null = null

export async function getBuiltinToolsInstance(): Promise<Tool[]> {
  if (!_builtinTools) {
    _builtinTools = await getBuiltinTools()
  }
  return _builtinTools
}

export const builtinTools: Tool[] = [] // 占位符，实际通过getBuiltinToolsInstance获取
