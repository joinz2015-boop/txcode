/**
 * Agent 公共工具处理模块
 *
 * 设计目标:
 * - 各 agent 仅声明自己的工具白名单(在各 agent 目录下的 agent_tool.ts)
 * - 工具加载、过滤、查找、执行等重复逻辑统一收敛到本文件
 * - Registry 是纯逻辑层,无任何工具常量内嵌
 *
 * 兼容点:
 * - execute() 支持 verboseError(code 模式:工具不存在时附 Available tools 列表)
 * - buildToolContext() 支持 dream/mem/skill 等写死 sessionId 的需求
 * - parseToolCalls() 静态方法,统一处理 arguments 字符串/对象兼容
 */

import { Tool, ToolContext } from '../../tools/tool.types.js';
import { getProviderTools } from '../../tools/provider/index.js';
import { getOpenAITools } from '../../tools/provider/tools.js';
import { ProviderToolCall } from '../provider/base.js';
import { ToolDefinition } from '../ai.types.js';

export interface AgentToolRegistryOptions {
  /**
   * 工具不存在时,错误信息是否附带可用工具列表
   * - true: "Tool not found: X. Available tools: ..."
   * - false(默认): "Tool not found: X"
   */
  verboseError?: boolean;
  /**
   * 是否加载所有工具(忽略 allowedTools)
   * - 适配 common 模式:不做白名单过滤,把全量工具作为 Function Calling 候选
   */
  loadAll?: boolean;
}

export interface ExecuteOptions {
  abortSignal?: AbortSignal;
}

export type ToolExecutionResult = { success: boolean; data?: any; error?: string };

/**
 * Agent 工具注册器
 *
 * 用法:
 *   const registry = new AgentToolRegistry(CODE_TOOLS, { verboseError: true });
 *   const tools = await registry.getDefinitions();
 *   const result = await registry.execute(name, args, ctx);
 *   const calls = AgentToolRegistry.parseToolCalls(response.toolCalls);
 */
export class AgentToolRegistry {
  private allowedTools: ReadonlyArray<string> | null;
  private verboseError: boolean;
  private loadAll: boolean;
  private rawToolsMap: Map<string, Tool> = new Map();
  private loaded: boolean = false;

  constructor(
    allowedTools: ReadonlyArray<string> | null,
    options: AgentToolRegistryOptions = {}
  ) {
    this.allowedTools = allowedTools;
    this.verboseError = options.verboseError ?? false;
    this.loadAll = options.loadAll ?? false;
  }

  /**
   * lazy 加载:首次访问时从 getProviderTools 加载并按白名单过滤
   */
  private async ensureLoaded(): Promise<void> {
    if (this.loaded) return;
    const allTools = await getProviderTools();
    for (const tool of allTools) {
      if (this.loadAll || this.allowedTools === null || this.allowedTools.includes(tool.name)) {
        this.rawToolsMap.set(tool.name, tool);
      }
    }
    this.loaded = true;
  }

  /**
   * 取得白名单内(或全量)工具的 OpenAI 形态定义,供 provider.chat 的 `tools` 参数使用
   */
  async getDefinitions(): Promise<ToolDefinition[]> {
    await this.ensureLoaded();
    return Array.from(this.rawToolsMap.values()).map(tool => this.toOpenAITool(tool));
  }

  /**
   * 取得所有内置工具的 OpenAI 形态定义(全量),供系统 prompt 中描述使用
   */
  async getBuiltinDefinitions(): Promise<ToolDefinition[]> {
    return await getOpenAITools();
  }

  /**
   * 统一执行入口
   * - verboseError=true 时,工具不存在时附带 "Available tools: ..." 列表
   * - 返回 `{ success, data?, error? }`,捕获所有异常,不会向上抛
   */
  async execute(
    name: string,
    args: Record<string, any>,
    context: ToolContext
  ): Promise<ToolExecutionResult> {
    await this.ensureLoaded();
    try {
      const tool = this.rawToolsMap.get(name);
      if (!tool) {
        const available = Array.from(this.rawToolsMap.keys()).join(', ');
        const suffix = this.verboseError ? `. Available tools: ${available}` : '';
        throw new Error(`Tool not found: ${name}${suffix}`);
      }
      const result = await tool.execute(args, context);
      return { success: result.success, data: result.output, error: result.error };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * 解析 provider 返回的 toolCalls,统一处理 arguments 字符串/对象兼容
   * - 静态方法,不依赖 Registry 实例状态
   */
  static parseToolCalls(rawToolCalls: any[]): ProviderToolCall[] {
    if (!rawToolCalls || rawToolCalls.length === 0) return [];
    return rawToolCalls.map((tc: any) => {
      let parsedArgs: Record<string, any>;
      if (typeof tc.function.arguments === 'string') {
        try {
          parsedArgs = JSON.parse(tc.function.arguments);
        } catch {
          parsedArgs = {};
        }
      } else {
        parsedArgs = tc.function.arguments || {};
      }
      return {
        id: tc.id,
        name: tc.function.name,
        arguments: parsedArgs,
      };
    });
  }

  private toOpenAITool(tool: Tool): ToolDefinition {
    return {
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    };
  }
}

/**
 * 构造工具执行上下文
 * - sessionId 显式传入(适配 dream/mem/skill 等固定 sessionId 的需求)
 * - workDir 默认 process.cwd()
 */
export function buildToolContext(input: {
  sessionId: string;
  projectPath?: string;
}): ToolContext {
  return {
    sessionId: input.sessionId,
    workDir: input.projectPath || process.cwd(),
  };
}
