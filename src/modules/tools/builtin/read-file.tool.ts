/**
 * 文件读取工具
 */

import * as fs from 'fs';
import * as path from 'path';
import { Tool } from '../tool.types.js';

export const readFileTool: Tool = {
  name: 'read_file',
  description: '读取文件内容。支持读取文本文件，返回文件内容字符串。',
  parameters: {
    type: 'object',
    properties: {
      file_path: {
        type: 'string',
        description: '文件的绝对路径',
      },
      offset: {
        type: 'number',
        description: '起始行号（可选，从1开始）',
      },
      limit: {
        type: 'number',
        description: '读取行数（可选）',
      },
    },
    required: ['file_path'],
  },
  execute: async (params: { file_path: string; offset?: number; limit?: number }): Promise<string> => {
    const { file_path, offset = 1, limit } = params;

    if (!fs.existsSync(file_path)) {
      return `错误: 文件不存在: ${file_path}`;
    }

    try {
      const content = fs.readFileSync(file_path, 'utf-8');
      const lines = content.split('\n');
      
      const startLine = Math.max(1, offset) - 1;
      const endLine = limit ? startLine + limit : lines.length;
      
      const selectedLines = lines.slice(startLine, endLine);
      
      return selectedLines
        .map((line, i) => `${startLine + i + 1}: ${line}`)
        .join('\n');
    } catch (error) {
      return `错误: 读取文件失败: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
};