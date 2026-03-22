import * as fs from 'fs';
import * as path from 'path';
import { Tool } from '../tool.types.js';

function glob(pattern: string, dir: string): string[] {
  const results: string[] = [];
  const ignore = ['node_modules', '.git', 'dist', 'build', '.next', 'coverage'];

  if (!fs.existsSync(dir)) {
    return [];
  }

  const walk = (currentDir: string) => {
    try {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isDirectory()) {
          if (!ignore.includes(entry.name)) {
            walk(path.join(currentDir, entry.name));
          }
        } else {
          const fullPath = path.join(currentDir, entry.name);
          const relativePath = path.relative(dir, fullPath).split(path.sep).join('/');
          
          if (matchGlob(pattern, relativePath) || matchGlob(pattern, entry.name)) {
            results.push(relativePath);
          }
        }
      }
    } catch {
      // 忽略无权限目录
    }
  };

  walk(dir);
  return results;
}

function matchGlob(pattern: string, filePath: string): boolean {
  const normalizedPattern = pattern.replace(/\\/g, '/');
  const normalizedPath = filePath.replace(/\\/g, '/');
  
  const regexStr = normalizedPattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '<<DOUBLESTAR>>')
    .replace(/\*/g, '[^/]*')
    .replace(/<<DOUBLESTAR>>/g, '.*')
    .replace(/\?/g, '[^/]');
  
  const regex = new RegExp(`^${regexStr}$`);
  return regex.test(normalizedPath);
}

export const globTool: Tool = {
  name: 'find_files',
  description: '使用 glob 模式搜索文件。支持 ** 和 * 通配符。搜索时会忽略 node_modules、.git、dist 等目录。',
  parameters: {
    type: 'object',
    properties: {
      pattern: {
        type: 'string',
        description: 'glob 模式，如 "**/*.ts" 匹配所有 ts 文件，"src/**/*.js" 匹配 src 目录下所有 js 文件',
      },
      directory: {
        type: 'string',
        description: '搜索目录的绝对路径（可选，默认当前工作目录）',
      },
    },
    required: ['pattern'],
  },
  execute: async (params: { pattern: string; directory?: string }): Promise<string> => {
    const { pattern } = params;
    let directory = params.directory || process.cwd();

    if (directory.startsWith('@')) {
      directory = directory.substring(1);
    }

    // 规范化路径
    directory = path.resolve(directory);

    if (!fs.existsSync(directory)) {
      return `错误: 目录不存在: ${directory}`;
    }

    try {
      const results = glob(pattern, directory);
      
      if (results.length === 0) {
        return `未找到匹配文件: ${pattern}\n搜索目录: ${directory}`;
      }
      
      if (results.length > 100) {
        return `找到 ${results.length} 个文件，显示前 100 个:\n${results.slice(0, 100).join('\n')}\n\n搜索目录: ${directory}`;
      }
      
      return `找到 ${results.length} 个文件:\n${results.join('\n')}\n\n搜索目录: ${directory}`;
    } catch (error) {
      return `错误: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
};
