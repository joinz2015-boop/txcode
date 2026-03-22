/**
 * Bash 命令执行工具
 */

import { execSync } from 'child_process';
import { Tool } from '../tool.types.js';

export const bashTool: Tool = {
  name: 'execute_bash',
  description: '执行 shell 命令。注意：根据当前操作系统选择正确的命令语法（Windows 使用 dir/copy/del，Linux/macOS 使用 ls/cp/rm）。',
  parameters: {
    type: 'object',
    properties: {
      command: {
        type: 'string',
        description: '要执行的命令',
      },
      workdir: {
        type: 'string',
        description: '工作目录（可选）',
      },
      timeout: {
        type: 'number',
        description: '超时时间（毫秒，可选，默认 120000）',
      },
    },
    required: ['command'],
  },
  execute: async (params: {
    command: string;
    workdir?: string;
    timeout?: number;
  }): Promise<string> => {
    const { command, workdir, timeout = 120000 } = params;

    const forbidden = ['rm -rf /', 'sudo', 'chmod 777', '> /dev/sd'];
    if (forbidden.some(f => command.includes(f))) {
      return `错误: 禁止执行的命令`;
    }

    try {
      const result = execSync(command, {
        cwd: workdir,
        timeout,
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      return result.trim() || '命令执行成功（无输出）';
    } catch (error: any) {
      const stderr = error.stderr?.toString() || '';
      const stdout = error.stdout?.toString() || '';
      
      if (stderr) {
        return `命令执行错误:\n${stderr}`;
      }
      return `错误: ${error.message}`;
    }
  },
};