import * as fs from 'fs';
import * as path from 'path';
import { Tool } from '../tool.types.js';

const MAX_LINES = 300;

export const readFileTool: Tool = {
  name: 'read_file',
  description: `读取文件内容。每次最多读取 ${MAX_LINES} 行。如果文件超过 ${MAX_LINES} 行，需要多次调用并使用 offset 参数继续读取。`,
  parameters: {
    type: 'object',
    properties: {
      file_path: {
        type: 'string',
        description: '文件的绝对路径',
      },
      offset: {
        type: 'number',
        description: `起始行号（从1开始，默认1）`,
      },
      limit: {
        type: 'number',
        description: `读取行数（最多${MAX_LINES}行，默认${MAX_LINES}）`,
      },
    },
    required: ['file_path'],
  },
  execute: async (params: { file_path: string; offset?: number; limit?: number }): Promise<string> => {
    const { file_path, offset = 1 } = params;
    let { limit = MAX_LINES } = params;

    if (limit > MAX_LINES) {
      limit = MAX_LINES;
    }

    if (!fs.existsSync(file_path)) {
      return `错误: 文件不存在: ${file_path}`;
    }

    try {
      const content = fs.readFileSync(file_path, 'utf-8');
      const lines = content.split('\n');
      const totalLines = lines.length;
      
      const startLine = Math.max(1, offset) - 1;
      const endLine = Math.min(startLine + limit, totalLines);
      
      const selectedLines = lines.slice(startLine, endLine);
      
      let result = selectedLines
        .map((line, i) => `${startLine + i + 1}: ${line}`)
        .join('\n');
      
      if (totalLines > endLine) {
        result += `\n\n--- 文件共 ${totalLines} 行，当前已读取到第 ${endLine} 行，还需读取 ${totalLines - endLine} 行 ---`;
        result += `\n--- 继续读取请使用: read_file(file_path="${file_path}", offset=${endLine + 1}) ---`;
      }
      
      return result;
    } catch (error) {
      return `错误: 读取文件失败: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
};
