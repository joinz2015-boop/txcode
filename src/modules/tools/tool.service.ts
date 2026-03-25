/**
 * 工具服务模块
 * 
 * 本模块负责工具的注册、管理和执行
 * 
 * 核心功能：
 * 1. 工具注册 - 提供 register() 方法添加新工具
 * 2. 工具获取 - 提供 get() 方法根据名称获取工具
 * 3. 工具执行 - 提供 execute() 方法执行工具逻辑
 * 4. 工具列表 - 提供 getAll() 方法获取所有已注册工具
 * 5. 内置工具 - 初始化时自动注册常用工具 (文件读写、命令执行等)
 * 
 * 内置工具列表：
 * - read_file: 读取文件内容
 * - write_file: 创建新文件
 * - edit_file: 编辑现有文件
 * - execute_bash: 执行 Shell 命令
 * - find_files / glob: 文件搜索
 * - grep: 内容搜索
 * - loadSkill: 加载技能
 */

import { Tool, ToolContext, ToolCall, ToolCallResult } from './tool.types.js';
import { getBuiltinToolsInstance } from './builtin/index.js';

/**
 * ToolService 类
 * 
 * 工具服务是整个 Agent 系统的核心组件之一
 * 负责管理系统中所有可用的工具，包括内置工具和自定义工具
 * 
 * 使用方式：
 *   import { toolService } from '../tools/index.js';
 *   
 *   // 执行工具
 *   const result = await toolService.execute('read_file', { file_path: 'src/index.ts' });
 *   
 *   // 注册自定义工具
 *   toolService.register({
 *     name: 'my_custom_tool',
 *     description: '自定义工具描述',
 *     parameters: { ... },
 *     execute: async (params) => { ... }
 *   });
 */
export class ToolService {
  /** 工具注册表，使用 Map 存储，key 为工具名称 */
  private tools: Map<string, Tool> = new Map();
  private initialized: boolean = false;
  private initPromise: Promise<void> | null = null;

  /**
   * 构造函数
   * 
   * 初始化时自动调用 registerBuiltinTools() 注册内置工具
   * 这样应用启动后立即可以使用所有内置工具
   */
  constructor() {
    this.initPromise = this.registerBuiltinTools();
  }

  /**
   * 等待工具服务初始化完成
   */
  async waitForInit(): Promise<void> {
    if (this.initialized) return;
    if (this.initPromise) {
      await this.initPromise;
      this.initialized = true;
    }
  }

  /**
   * 注册内置工具
   * 
   * 从 builtin/index.ts 导入所有内置工具并注册
   * 内置工具包括文件操作、命令执行、搜索等功能
   * 
   * 注册流程：
   * 1. 调用 getBuiltinToolsInstance() 获取内置工具
   * 2. 遍历工具数组
   * 3. 将每个工具的名称作为 key，工具对象作为 value 存入 Map
   */
  private async registerBuiltinTools(): Promise<void> {
    const builtinTools = await getBuiltinToolsInstance();
    for (const tool of builtinTools) {
      this.tools.set(tool.name, tool);
    }
  }

  /**
   * 注册工具
   * 
   * 用于添加自定义工具到系统中
   * 可以覆盖同名的内置工具 (不推荐)
   * 
   * @param tool - 工具对象，包含 name、description、parameters、execute
   * 
   * @example
   * toolService.register({
   *   name: 'my_tool',
   *   description: '我的自定义工具',
   *   parameters: {
   *     type: 'object',
   *     properties: { input: { type: 'string' } },
   *     required: ['input']
   *   },
   *   execute: async (params) => {
   *     return `处理: ${params.input}`;
   *   }
   * });
   */
  register(tool: Tool): void {
    this.tools.set(tool.name, tool);
  }

  /**
   * 获取工具
   * 
   * 根据工具名称获取对应的工具对象
   * 
   * @param name - 工具名称
   * @returns {Tool | undefined} 工具对象，如果不存在则返回 undefined
   */
  async get(name: string): Promise<Tool | undefined> {
    await this.waitForInit();
    return this.tools.get(name);
  }

  /**
   * 获取所有工具
   * 
   * 返回已注册的所有工具列表，包括内置工具和自定义工具
   * 
   * @returns {Tool[]} 工具数组
   */
  async getAll(): Promise<Tool[]> {
    await this.waitForInit();
    return Array.from(this.tools.values());
  }

  /**
   * 执行工具
   * 
   * 根据工具名称和参数执行对应的工具逻辑
   * 
   * 执行流程：
   * 1. 根据名称从 Map 中获取工具对象
   * 2. 如果工具不存在，抛出错误
   * 3. 调用工具的 execute() 方法，传入参数
   * 4. 返回工具执行结果
   * 
   * @param name - 工具名称
   * @param params - 工具参数字典
   * @returns {Promise<string>} 工具执行结果 (字符串形式)
   * @throws {Error} 如果工具不存在
   * 
   * @example
   * // 读取文件
   * const content = await toolService.execute('read_file', { file_path: 'src/index.ts' });
   * 
   * // 执行命令
   * const result = await toolService.execute('execute_bash', { command: 'ls -la' });
   */
  async execute(name: string, params: any): Promise<string> {
    await this.waitForInit();
    const tool = this.tools.get(name);
    
    if (!tool) {
      throw new Error(`Tool not found: ${name}`);
    }
    
    const context: ToolContext = {
      sessionId: '',
      workDir: process.cwd(),
    };
    
    const result = await tool.execute(params, context);
    
    if (!result.success) {
      throw new Error(result.error || 'Tool execution failed');
    }
    
    return result.output;
  }

  async executeParallel(calls: ToolCall[]): Promise<ToolCallResult[]> {
    await this.waitForInit();
    
    const context: ToolContext = {
      sessionId: '',
      workDir: process.cwd(),
    };

    const executeCall = async (call: ToolCall): Promise<ToolCallResult> => {
      const startTime = Date.now();
      try {
        const tool = this.tools.get(call.name);
        if (!tool) {
          throw new Error(`Tool not found: ${call.name}`);
        }
        const result = await tool.execute(call.params, context);
        return {
          name: call.name,
          params: call.params,
          success: result.success,
          output: result.output,
          error: result.error,
          metadata: result.metadata,
          duration: Date.now() - startTime,
        };
      } catch (error) {
        return {
          name: call.name,
          params: call.params,
          success: false,
          output: '',
          error: error instanceof Error ? error.message : String(error),
          duration: Date.now() - startTime,
        };
      }
    };

    return Promise.all(calls.map(executeCall));
  }

  async executeSequential(calls: ToolCall[]): Promise<ToolCallResult[]> {
    await this.waitForInit();
    
    const context: ToolContext = {
      sessionId: '',
      workDir: process.cwd(),
    };

    const results: ToolCallResult[] = [];

    for (const call of calls) {
      const startTime = Date.now();
      try {
        const tool = this.tools.get(call.name);
        if (!tool) {
          throw new Error(`Tool not found: ${call.name}`);
        }
        const result = await tool.execute(call.params, context);
        results.push({
          name: call.name,
          params: call.params,
          success: result.success,
          output: result.output,
          error: result.error,
          metadata: result.metadata,
          duration: Date.now() - startTime,
        });
      } catch (error) {
        results.push({
          name: call.name,
          params: call.params,
          success: false,
          output: '',
          error: error instanceof Error ? error.message : String(error),
          duration: Date.now() - startTime,
        });
      }
    }

    return results;
  }

  /**
   * 获取工具定义 (用于 AI)
   * 
   * 返回符合 OpenAI Function Calling 格式的工具定义
   * 这些定义会被添加到 AI 的系统提示词中
   * 让 AI 知道有哪些工具可以使用以及如何调用
   * 
   * @returns {Array} 工具定义数组
   * 
   * @example
   * 返回格式:
   * [
   *   {
   *     type: 'function',
   *     function: {
   *       name: 'read_file',
   *       description: '读取文件内容...',
   *       parameters: { type: 'object', properties: {...}, required: [...] }
   *     }
   *   }
   * ]
   */
  async getToolDefinitions(): Promise<Array<{
    type: 'function';
    function: {
      name: string;
      description: string;
      parameters: Record<string, any>;
    };
  }>> {
    const tools = await this.getAll();
    return tools.map((tool) => ({
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
   * 
   * @param name - 工具名称
   * @returns {boolean} 如果工具存在返回 true，否则返回 false
   */
  async has(name: string): Promise<boolean> {
    await this.waitForInit();
    return this.tools.has(name);
  }

  /**
   * 移除工具
   * 
   * 从注册表中删除指定工具
   * 
   * @param name - 工具名称
   * @returns {boolean} 如果成功删除返回 true，工具不存在返回 false
   */
  async remove(name: string): Promise<boolean> {
    await this.waitForInit();
    return this.tools.delete(name);
  }

  /**
   * 清空所有自定义工具
   * 
   * 保留所有内置工具，只删除用户自定义的工具
   * 
   * 使用场景：
   * - 切换项目时重置工具配置
   * - 清除临时添加的工具
   */
  async clearCustom(): Promise<void> {
    const builtinTools = await getBuiltinToolsInstance();
    const builtinNames = new Set(builtinTools.map(t => t.name));
    
    for (const name of this.tools.keys()) {
      if (!builtinNames.has(name)) {
        this.tools.delete(name);
      }
    }
  }
}

/**
 * 工具服务单例实例
 * 
 * 在整个应用中共享同一个 ToolService 实例
 * 应用启动时自动注册所有内置工具
 * 
 * 使用方式：
 *   import { toolService } from '../tools/index.js';
 *   
 *   // 执行工具
 *   const result = await toolService.execute('read_file', { file_path: '...' });
 */
export const toolService = new ToolService();