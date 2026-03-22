/**
 * 文件写入工具
 */

import * as fs from 'fs';
import * as path from 'path';
import { Tool } from '../tool.types.js';

export const writeFileTool: Tool = {
  name: 'write_file',
  description: '写入或创建文件。如果文件存在会覆盖，不存在则创建。',
  parameters: {
    type: 'object',
    properties: {
      file_path: {
        type: 'string',
        description: '文件的绝对路径',
      },
      content: {
        type: 'string',
        description: '要写入的文件内容',
      },
    },
    required: ['file_path', 'content'],
  },
  execute: async (params: { file_path: string; content: string }): Promise<string> => {
    const { file_path, content } = params;

    try {
      const dir = path.dirname(file_path);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(file_path, content, 'utf-8');
      return `成功: 文件已写入 ${file_path} (${content.length} 字符)`;
    } catch (error) {
      return `错误: 写入文件失败: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
};