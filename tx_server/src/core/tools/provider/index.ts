/**
 * Provider 模式工具导出
 * 针对 Provider 模式的工具描述
 */

import { Tool } from '../tool.types.js'
import { readFileTool } from './read_file.js'
import { writeFileTool } from './write_file.js'
import { editFileTool } from './edit_file.js'
import { globTool } from './glob.js'
import { grepTool } from './grep.js'
import { bashTool } from './bash.js'
import { todoReadTool } from './todo_read.js'
import { todoWriteTool } from './todo_write.js'
import { lspTool } from './lsp.js'
import { webSearchTool } from './web_search.js'
import { webFetchTool } from './web_fetch.js'
import { codeSearchTool } from './code_search.js'
import { memoryTool } from './memory.js'
import { skillTool } from '../../../services/skill/skill.tool.js'
import { emailTool } from './email.tool.js'
import { webShellExecTool } from './web_shell_exec.js'
import { testNavigateTool } from './test_navigate.js'
import { testClickTool } from './test_click.js'
import { testTypeTool } from './test_type.js'
import { testScreenshotTool } from './test_screenshot.js'
import { testHoverTool } from './test_hover.js'
import { testSelectTool } from './test_select.js'
import { testWaitTool } from './test_wait.js'
import { testGetContentTool } from './test_get_content.js'
import { testAssertElementTool } from './test_assert_element.js'
import { testAssertTextTool } from './test_assert_text.js'
import { testGetUrlTool } from './test_get_url.js'

export async function getProviderTools(): Promise<Tool[]> {
  return [
    readFileTool,
    writeFileTool,
    editFileTool,
    globTool,
    grepTool,
    bashTool,
    todoReadTool,
    todoWriteTool,
    lspTool,
    webSearchTool,
    webFetchTool,
    codeSearchTool,
    memoryTool,
    skillTool,
    emailTool,
    webShellExecTool,
    testNavigateTool,
    testClickTool,
    testTypeTool,
    testScreenshotTool,
    testHoverTool,
    testSelectTool,
    testWaitTool,
    testGetContentTool,
    testAssertElementTool,
    testAssertTextTool,
    testGetUrlTool,
  ]
}
