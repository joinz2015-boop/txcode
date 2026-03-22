/**
 * Tools 模块类型定义
 */

export interface Tool {
  name: string;
  description: string;
  parameters: Record<string, any>;
  execute: (params: any) => Promise<string>;
}

export interface ToolResult {
  success: boolean;
  output: string;
  error?: string;
}