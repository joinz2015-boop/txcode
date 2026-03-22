/**
 * API 类型定义文件
 * 
 * 这个文件定义了整个 API 系统的 TypeScript 接口和类型定义。
 * 主要用于：
 * 1. 统一 API 请求和响应的数据结构
 * 2. 提供类型安全保证
 * 3. 方便前后端类型同步
 * 4. 作为 API 文档的一部分
 */

import { Request, Response, NextFunction } from 'express';

/**
 * 通用 API 响应接口
 * @template T - 响应数据的类型（默认为 any）
 * 
 * 所有 API 响应都应该遵循这个格式，确保前后端数据格式一致。
 * 
 * @property success - 请求是否成功
 * @property data - 成功时的响应数据（可选）
 * @property error - 错误信息（可选）
 * @property message - 一般消息（可选）
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * 聊天请求接口
 * 
 * 用于发送聊天消息到 AI 助手的请求数据结构
 * 
 * @property message - 用户发送的消息内容
 * @property sessionId - 会话ID，用于关联历史对话（可选）
 * @property projectPath - 项目路径，用于上下文感知（可选）
 * @property skill - 指定使用的技能或模型（可选）
 * @property stream - 是否使用流式响应（可选）
 */
export interface ChatRequest {
  message: string;
  sessionId?: string;
  projectPath?: string;
  skill?: string;
  stream?: boolean;
}

/**
 * 聊天响应接口
 * 
 * AI 助手返回的聊天响应数据结构
 * 
 * @property sessionId - 会话ID，用于后续对话关联
 * @property response - AI 助手的回复内容
 * @property toolCalls - 工具调用结果数组（可选）
 */
export interface ChatResponse {
  sessionId: string;
  response: string;
  toolCalls?: ToolCallResult[];
}

/**
 * 工具调用结果接口
 * 
 * 记录 AI 助手调用工具的结果
 * 
 * @property tool - 调用的工具名称
 * @property input - 工具调用的输入参数
 * @property output - 工具调用的输出结果
 */
export interface ToolCallResult {
  tool: string;
  input: any;
  output: string;
}

/**
 * 会话创建请求接口
 * 
 * 用于创建新的聊天会话
 * 
 * @property title - 会话标题
 * @property projectPath - 关联的项目路径（可选）
 */
export interface SessionCreateRequest {
  title: string;
  projectPath?: string;
}

/**
 * AI 提供商创建请求接口
 * 
 * 用于添加或配置 AI 服务提供商（如 OpenAI、Claude 等）
 * 
 * @property id - 提供商唯一标识符
 * @property name - 提供商显示名称
 * @property apiKey - API 密钥
 * @property baseUrl - 自定义 API 基础URL（可选）
 * @property enabled - 是否启用该提供商（可选）
 */
export interface ProviderCreateRequest {
  id: string;
  name: string;
  apiKey: string;
  baseUrl?: string;
  enabled?: boolean;
}

/**
 * 技能信息接口
 * 
 * 用于描述 AI 技能的信息
 * 
 * @property id - 技能唯一标识符
 * @property name - 技能显示名称
 * @property description - 技能描述
 * @property enabled - 是否启用该技能（可选）
 * @property category - 技能分类（可选）
 */
export interface SkillInfo {
  id: string;
  name: string;
  description: string;
  enabled?: boolean;
  category?: string;
}

/**
 * 会话信息接口
 * 
 * 用于描述聊天会话的信息
 * 
 * @property id - 会话唯一标识符
 * @property title - 会话标题
 * @property projectPath - 关联的项目路径（可选）
 * @property createdAt - 创建时间戳
 * @property updatedAt - 最后更新时间戳
 * @property messageCount - 消息数量（可选）
 */
export interface SessionInfo {
  id: string;
  title: string;
  projectPath?: string;
  createdAt: number;
  updatedAt: number;
  messageCount?: number;
}

/**
 * 消息信息接口
 * 
 * 用于描述聊天消息的信息
 * 
 * @property id - 消息唯一标识符
 * @property sessionId - 所属会话ID
 * @property role - 消息角色（user 或 assistant）
 * @property content - 消息内容
 * @property timestamp - 消息时间戳
 * @property toolCalls - 工具调用结果数组（可选）
 */
export interface MessageInfo {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  toolCalls?: ToolCallResult[];
}

/**
 * 错误响应接口
 * 
 * 用于统一的错误响应格式
 * 
 * @property code - 错误代码
 * @property message - 错误消息
 * @property details - 错误详情（可选）
 */
export interface ErrorResponse {
  code: string;
  message: string;
  details?: any;
}

/**
 * 分页参数接口
 * 
 * 用于支持分页查询的请求参数
 * 
 * @property page - 页码（从1开始）
 * @property pageSize - 每页数量
 * @property sortBy - 排序字段（可选）
 * @property sortOrder - 排序顺序（asc 或 desc，可选）
 */
export interface PaginationParams {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * 分页响应接口
 * 
 * 用于支持分页查询的响应格式
 * 
 * @template T - 数据项的类型
 * 
 * @property items - 当前页的数据项数组
 * @property total - 总数据项数量
 * @property page - 当前页码
 * @property pageSize - 每页数量
 * @property totalPages - 总页数
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * 模型信息接口
 * 
 * 用于描述 AI 模型的信息
 * 
 * @property id - 模型唯一标识符
 * @property providerId - 所属提供商ID
 * @property name - 模型显示名称
 * @property enabled - 是否启用该模型（可选）
 * @property contextLength - 上下文长度（可选）
 * @property maxTokens - 最大输出token数（可选）
 */
export interface ModelInfo {
  id: string;
  providerId: string;
  name: string;
  enabled?: boolean;
  contextLength?: number;
  maxTokens?: number;
}

/**
 * 模型创建请求接口
 * 
 * 用于添加新的 AI 模型
 * 
 * @property id - 模型唯一标识符
 * @property providerId - 所属提供商ID
 * @property name - 模型显示名称
 * @property enabled - 是否启用该模型（可选）
 * @property contextLength - 上下文长度（可选）
 * @property maxTokens - 最大输出token数（可选）
 */
export interface ModelCreateRequest {
  id: string;
  providerId: string;
  name: string;
  enabled?: boolean;
  contextLength?: number;
  maxTokens?: number;
}

/**
 * 提供商信息接口
 * 
 * 用于描述 AI 提供商的信息
 * 
 * @property id - 提供商唯一标识符
 * @property name - 提供商显示名称
 * @property baseUrl - API 基础URL
 * @property enabled - 是否启用该提供商
 * @property isDefault - 是否为默认提供商
 */
export interface ProviderInfo {
  id: string;
  name: string;
  baseUrl: string;
  enabled: boolean;
  isDefault: boolean;
}

/**
 * 配置项接口
 * 
 * 用于描述配置项的信息
 * 
 * @property key - 配置项键名
 * @property value - 配置项值
 * @property description - 配置项描述（可选）
 * @property type - 配置项类型（string、number、boolean、object、array，可选）
 */
export interface ConfigItem {
  key: string;
  value: any;
  description?: string;
  type?: 'string' | 'number' | 'boolean' | 'object' | 'array';
}

/**
 * 搜索请求接口
 * 
 * 用于搜索会话、技能等资源的请求参数
 * 
 * @property query - 搜索关键词
 * @property limit - 返回结果数量限制（可选）
 * @property offset - 结果偏移量（可选）
 */
export interface SearchRequest {
  query: string;
  limit?: number;
  offset?: number;
}

/**
 * 流式聊天响应接口
 * 
 * 用于流式聊天响应的数据结构
 * 
 * @property chunk - 当前数据块
 * @property done - 是否完成
 * @property sessionId - 会话ID
 * @property toolCalls - 工具调用结果数组（可选）
 */
export interface StreamChatResponse {
  chunk: string;
  done: boolean;
  sessionId: string;
  toolCalls?: ToolCallResult[];
}

/**
 * 工具信息接口
 * 
 * 用于描述工具的信息
 * 
 * @property name - 工具名称
 * @property description - 工具描述
 * @property parameters - 工具参数定义
 * @property required - 必需参数列表（可选）
 */
export interface ToolInfo {
  name: string;
  description: string;
  parameters: Record<string, any>;
  required?: string[];
}

/**
 * 技能详情接口
 * 
 * 用于描述技能的详细信息
 * 
 * @property name - 技能名称
 * @property description - 技能描述
 * @property tools - 技能包含的工具列表
 * @property instructions - 技能使用说明（可选）
 * @property examples - 使用示例（可选）
 */
export interface SkillDetail {
  name: string;
  description: string;
  tools: ToolInfo[];
  instructions?: string;
  examples?: string[];
}