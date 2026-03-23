/**
 * 内容搜索工具（Grep）
 * 
 * 在文件内容中搜索匹配的文本
 * 
 * 参数说明：
 * - pattern: 要搜索的正则表达式模式
 * - dir: 搜索的根目录
 * - filePattern: 文件名匹配模式 (可选，如 *.ts, *.js)
 * 
 * 功能特性：
 * - 支持正则表达式搜索
 * - 支持文件名过滤
 * - 自动忽略 node_modules, .git 等目录
 * - 限制最大结果数为 100 条
 * 
 * 使用示例：
 *   grep({
 *     pattern: 'function\\s+\\w+',
 *     dir: '/project/src',
 *     filePattern: '*.ts'
 *   })
 */

import * as fs from 'fs';
import * as path from 'path';
import { Tool } from '../tool.types.js';

/**
 * 搜索结果接口
 */
interface Match {
  file: string;      // 文件路径
  line: number;      // 行号
  content: string;   // 匹配的行内容
}

function grep(
  pattern: string,
  dir: string,
  filePattern?: string
): Match[] {
  const results: Match[] = [];
  const regex = new RegExp(pattern, 'g');
  const ignore = ['node_modules', '.git', 'dist', 'build', '.next', 'coverage'];
  const maxResults = 100;

  const walk = (currentDir: string) => {
    if (results.length >= maxResults) return;

    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      if (results.length >= maxResults) break;

      if (entry.isDirectory()) {
        if (!ignore.includes(entry.name)) {
          walk(path.join(currentDir, entry.name));
        }
      } else {
        const fullPath = path.join(currentDir, entry.name);
        const relativePath = path.relative(dir, fullPath);

        if (filePattern && !matchGlob(filePattern, relativePath)) {
          continue;
        }

        try {
          const content = fs.readFileSync(fullPath, 'utf-8');
          const lines = content.split('\n');

          for (let i = 0; i < lines.length && results.length < maxResults; i++) {
            if (regex.test(lines[i])) {
              results.push({
                file: relativePath,
                line: i + 1,
                content: lines[i].trim().slice(0, 200),
              });
            }
          }
        } catch {}
      }
    }
  };

  walk(dir);
  return results;
}

function matchGlob(pattern: string, filePath: string): boolean {
  const regex = new RegExp(
    '^' + pattern
      .replace(/\*\*/g, '<<DOUBLESTAR>>')
      .replace(/\*/g, '[^/]*')
      .replace(/<<DOUBLESTAR>>/g, '.*')
      .replace(/\?/g, '[^/]')
      .replace(/\./g, '\\.')
      .replace(/\\/g, '/')
    + '$'
  );
  return regex.test(filePath.replace(/\\/g, '/'));
}

export const grepTool: Tool = {
  name: 'search_content',
  description: '在文件中搜索正则表达式模式。返回匹配的文件名和行号。',
  parameters: {
    type: 'object',
    properties: {
      pattern: {
        type: 'string',
        description: '正则表达式模式',
      },
      directory: {
        type: 'string',
        description: '搜索目录（可选）',
      },
      include: {
        type: 'string',
        description: '文件模式过滤（可选，如 "*.ts"）',
      },
    },
    required: ['pattern'],
  },
  execute: async (params: {
    pattern: string;
    directory?: string;
    include?: string;
  }): Promise<string> => {
    let { pattern, directory = process.cwd(), include } = params;

    if (directory.startsWith('@')) {
      directory = directory.substring(1);
    }

    try {
      const results = grep(pattern, directory, include);

      if (results.length === 0) {
        return `未找到匹配: ${pattern}`;
      }

      const output = results.map(r => `${r.file}:${r.line}: ${r.content}`).join('\n');
      return `找到 ${results.length} 处匹配:\n${output}`;
    } catch (error) {
      return `错误: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
};