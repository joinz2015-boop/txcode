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
import { skillTool } from '../../skill/skill.tool.js'

import fs from 'fs/promises'
import path from 'path'

const DESCRIPTIONS_DIR = import.meta.dirname

async function loadDescription(filename: string, baseDir?: string): Promise<string> {
  try {
    const dir = baseDir || DESCRIPTIONS_DIR
    return await fs.readFile(path.join(dir, filename), 'utf-8')
  } catch {
    return ''
  }
}

export async function getBuiltinTools(): Promise<Tool[]> {
  const [bashDesc, readFileDesc, writeFileDesc, editFileDesc, globDesc, grepDesc, todoReadDesc, todoWriteDesc, lspDesc, webSearchDesc, webFetchDesc, codeSearchDesc] = await Promise.all([
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
  ])

  const skillDesc = await loadDescription('skill.txt', path.join(import.meta.dirname, '..', '..', 'skill'))

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
    skillTool,
  ]
}

export const builtinTools: Tool[] = await getBuiltinTools()
