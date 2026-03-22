/**
 * 文件编辑工具
 */

import * as fs from 'fs';
import { Tool } from '../tool.types.js';

export const editFileTool: Tool = {
  name: 'edit_file',
  description: '编辑文件，替换指定内容。支持精确替换和全部替换。',
  parameters: {
    type: 'object',
    properties: {
      file_path: {
        type: 'string',
        description: '文件的绝对路径',
      },
      old_string: {
        type: 'string',
        description: '要被替换的内容',
      },
      new_string: {
        type: 'string',
        description: '替换后的新内容',
      },
      replace_all: {
        type: 'boolean',
        description: '是否替换所有匹配项（默认 false）',
      },
    },
    required: ['file_path', 'old_string', 'new_string'],
  },
  execute: async (params: {
    file_path: string;
    old_string: string;
    new_string: string;
    replace_all?: boolean;
  }): Promise<string> => {
    const { file_path, old_string, new_string, replace_all = false } = params;

    if (!fs.existsSync(file_path)) {
      return `错误: 文件不存在: ${file_path}`;
    }

    try {
      let content = fs.readFileSync(file_path, 'utf-8');
      
      if (!content.includes(old_string)) {
        return `错误: 未找到要替换的内容`;
      }

      if (replace_all) {
        content = content.split(old_string).join(new_string);
      } else {
        const firstIndex = content.indexOf(old_string);
        if (content.indexOf(old_string, firstIndex + 1) !== -1) {
          return `错误: 找到多个匹配项，请使用 replace_all 或提供更多上下文`;
        }
        content = content.replace(old_string, new_string);
      }

      fs.writeFileSync(file_path, content, 'utf-8');
      return `成功: 文件已更新 ${file_path}`;
    } catch (error) {
      return `错误: 编辑文件失败: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
};