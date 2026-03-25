/**
 * Tools 模块
 * 
 * 职责：
 * - 工具注册和执行
 * - 内置工具管理
 */

export { ToolService, toolService } from './tool.service.js';
export type { Tool, ToolResult, ToolCall, ToolCallResult } from './tool.types.js';
export { builtinTools } from './builtin/index.js';