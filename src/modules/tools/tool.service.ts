/**
 * Tool 服务
 * 
 * 职责：
 * - 工具注册和执行
 * - 内置工具管理
 */

import { Tool } from './tool.types.js';
import { builtinTools } from './builtin/index.js';

export class ToolService {
  private tools: Map<string, Tool> = new Map();

  constructor() {
    this.registerBuiltinTools();
  }

  /**
   * 注册内置工具
   */
  private registerBuiltinTools(): void {
    for (const tool of builtinTools) {
      this.tools.set(tool.name, tool);
    }
  }

  /**
   * 注册工具
   */
  register(tool: Tool): void {
    this.tools.set(tool.name, tool);
  }

  /**
   * 获取工具
   */
  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  /**
   * 获取所有工具
   */
  getAll(): Tool[] {
    return Array.from(this.tools.values());
  }

  /**
   * 执行工具
   */
  async execute(name: string, params: any): Promise<string> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool not found: ${name}`);
    }
    return tool.execute(params);
  }

  /**
   * 获取工具定义（用于 AI）
   */
  getToolDefinitions(): Array<{
    type: 'function';
    function: {
      name: string;
      description: string;
      parameters: Record<string, any>;
    };
  }> {
    return this.getAll().map((tool) => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }));
  }

  /**
   * 检查工具是否存在
   */
  has(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * 移除工具
   */
  remove(name: string): boolean {
    return this.tools.delete(name);
  }

  /**
   * 清空所有自定义工具（保留内置工具）
   */
  clearCustom(): void {
    const builtinNames = new Set(builtinTools.map(t => t.name));
    for (const name of this.tools.keys()) {
      if (!builtinNames.has(name)) {
        this.tools.delete(name);
      }
    }
  }
}

export const toolService = new ToolService();