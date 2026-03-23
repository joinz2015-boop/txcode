/**
 * 文件编辑工具
 * 
 * 用于编辑现有文件的内容，支持精确替换和全部替换
 * 
 * 参数说明：
 * - file_path: 要编辑的文件路径
 * - old_string: 要被替换的原始内容
 * - new_string: 替换后的新内容
 * - replace_all: 是否替换所有匹配项 (可选，默认 false)
 * 
 * 使用示例：
 *   edit_file({
 *     file_path: 'src/index.ts',
 *     old_string: 'const a = 1;',
 *     new_string: 'const a = 2;',
 *     replace_all: false
 *   })
 */

import * as fs from 'fs';
import { Tool } from '../tool.types.js';

/**
 * edit_file 工具定义
 * 
 * AI 可以使用此工具来：
 * 1. 修改文件中的特定代码
 * 2. 替换文本内容
 * 3. 批量修改匹配的内容
 */
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
    let { file_path, old_string, new_string, replace_all = false } = params;

    if (file_path.startsWith('@')) {
      file_path = file_path.substring(1);
    }

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