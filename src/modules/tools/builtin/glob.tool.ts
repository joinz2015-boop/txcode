/**
 * 文件搜索工具（Glob）
 */

import * as fs from 'fs';
import * as path from 'path';
import { Tool } from '../tool.types.js';

function glob(pattern: string, dir: string): string[] {
  const results: string[] = [];
  const ignore = ['node_modules', '.git', 'dist', 'build', '.next', 'coverage'];

  const walk = (currentDir: string) => {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (!ignore.includes(entry.name)) {
          walk(path.join(currentDir, entry.name));
        }
      } else {
        const fullPath = path.join(currentDir, entry.name);
        const relativePath = path.relative(dir, fullPath);
        
        if (matchGlob(pattern, relativePath) || matchGlob(pattern, entry.name)) {
          results.push(relativePath);
        }
      }
    }
  };

  walk(dir);
  return results;
}

function matchGlob(pattern: string, filePath: string): boolean {
  const parts = pattern.split('/');
  const fileParts = filePath.split('/');
  
  if (parts.length === 1) {
    return minimatch(filePath, pattern);
  }
  
  return minimatch(filePath, pattern);
}

function minimatch(str: string, pattern: string): boolean {
  const regexStr = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '<<DOUBLESTAR>>')
    .replace(/\*/g, '[^/]*')
    .replace(/<<DOUBLESTAR>>/g, '.*')
    .replace(/\?/g, '[^/]');
  
  const regex = new RegExp(`^${regexStr}$`);
  return regex.test(str);
}

export const globTool: Tool = {
  name: 'find_files',
  description: '使用 glob 模式搜索文件。支持 ** 和 * 通配符。',
  parameters: {
    type: 'object',
    properties: {
      pattern: {
        type: 'string',
        description: 'glob 模式，如 "**/*.ts" 或 "*.ts"',
      },
      directory: {
        type: 'string',
        description: '搜索目录（可选，默认当前目录）',
      },
    },
    required: ['pattern'],
  },
  execute: async (params: { pattern: string; directory?: string }): Promise<string> => {
    const { pattern, directory = process.cwd() } = params;

    try {
      const results = glob(pattern, directory);
      
      if (results.length === 0) {
        return `未找到匹配文件: ${pattern}`;
      }
      
      if (results.length > 100) {
        return `找到 ${results.length} 个文件，显示前 100 个:\n${results.slice(0, 100).join('\n')}`;
      }
      
      return `找到 ${results.length} 个文件:\n${results.join('\n')}`;
    } catch (error) {
      return `错误: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
};