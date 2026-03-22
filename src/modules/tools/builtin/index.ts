/**
 * 内置工具导出
 */

import { Tool } from '../tool.types.js';
import { readFileTool } from './read-file.tool.js';
import { writeFileTool } from './write-file.tool.js';
import { editFileTool } from './edit-file.tool.js';
import { bashTool } from './bash.tool.js';
import { globTool } from './glob.tool.js';
import { grepTool } from './grep.tool.js';

export const builtinTools: Tool[] = [
  readFileTool,
  writeFileTool,
  editFileTool,
  bashTool,
  globTool,
  grepTool,
];