import * as fs from 'fs';
import * as path from 'path';
import { Tool } from '../tool.types.js';

export const writeFileTool: Tool = {
  name: 'write_file',
  description: '创建新文件。如果文件已存在则报错，请使用 edit_file 工具修改已存在的文件。',
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

    if (fs.existsSync(file_path)) {
      return `错误: 文件已存在: ${file_path}\n如果要修改已存在的文件，请使用 edit_file 工具。`;
    }

    try {
      const dir = path.dirname(file_path);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(file_path, content, 'utf-8');
      return `成功: 新文件已创建 ${file_path} (${content.length} 字符)`;
    } catch (error) {
      return `错误: 写入文件失败: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
};
