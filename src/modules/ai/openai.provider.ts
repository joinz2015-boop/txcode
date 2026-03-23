/**
 * OpenAI Provider 模块
 * 
 * 本模块负责与 OpenAI API (及兼容 API) 进行交互
 * 
 * 核心功能：
 * 1. chat() - 发送聊天请求，获取完整响应
 * 2. chatStream() - 流式聊天，逐块获取响应
 * 3. Tool Calls - 支持 AI 调用工具 (Function Calling)
 * 
 * 支持的 AI 提供商：
 * - OpenAI (GPT-4, GPT-3.5)
 * - 兼容 OpenAI API 的其他提供商 (如 Anthropic Claude 通过适配器)
 * - 自定义 API 端点 (通过 baseUrl 配置)
 * 
 * 使用方式：
 *   const provider = new OpenAIProvider({
 *     apiKey: 'your-api-key',
 *     baseUrl: 'https://api.openai.com/v1',
 *     defaultModel: 'gpt-4'
 *   });
 *   
 *   const response = await provider.chat([
 *     { role: 'user', content: '你好' }
 *   ]);
 */

import {
  ChatMessage,
  ChatOptions,
  ChatResponse,
  ToolDefinition,
  ToolCall,
} from './ai.types.js';
import { logger } from '../logger/index.js';

/**
 * OpenAI Provider 配置参数
 */
export interface OpenAIConfig {
  /** API 密钥 */
  apiKey: string;
  /** API 基础 URL (可选，默认 OpenAI) */
  baseUrl?: string;
  /** 默认模型名称 (可选，默认 gpt-4) */
  defaultModel?: string;
}

/**
 * OpenAIProvider 类
 * 
 * 封装与 OpenAI API 的所有交互逻辑
 * 使用原生 fetch API 发送请求
 * 
 * API 端点：
 * - POST /chat/completions - 聊天完成
 * 
 * 请求格式：
 * - model: 模型名称
 * - messages: 消息数组
 * - temperature: 温度参数 (0-2)
 * - max_tokens: 最大 Token 数
 * - tools: 工具定义数组 (可选)
 * - tool_choice: 工具选择策略 (可选)
 * - stream: 是否流式响应 (可选)
 */
export class OpenAIProvider {
  /** API 密钥 */
  private apiKey: string;
  /** API 基础 URL */
  private baseUrl: string;
  /** 默认模型名称 */
  private defaultModel: string;

  /**
   * 构造函数
   * 
   * @param config - 配置对象
   * 
   * baseUrl 默认值说明：
   * - OpenAI: https://api.openai.com/v1
   * - 本地部署: http://localhost:11434/v1 (Ollama)
   * - 自定义: 用户配置的任意兼容 API 地址
   */
  constructor(config: OpenAIConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.openai.com/v1';
    this.defaultModel = config.defaultModel || 'gpt-4';
  }

  /**
   * 发送聊天请求 (非流式)
   * 
   * 将消息数组发送给 AI，获取完整的响应
   * 支持 Tool Calls 功能
   * 
   * 执行流程：
   * 1. 构建请求体 (model, messages, temperature 等)
   * 2. 如果有工具定义，添加到请求体
   * 3. 发送 POST 请求到 /chat/completions
   * 4. 解析响应，返回 ChatResponse
   * 
   * @param messages - 消息数组，包含角色和内容
   * @param options - 可选配置 (temperature, maxTokens, model, tools)
   * @returns {Promise<ChatResponse>} AI 响应对象
   * 
   * @example
   * const response = await provider.chat([
   *   { role: 'system', content: '你是一个助手' },
   *   { role: 'user', content: '你好' }
   * ]);
   * 
   * console.log(response.content);  // AI 的回复
   * console.log(response.usage);    // Token 使用量
   */
  async chat(
    messages: ChatMessage[],
    options: ChatOptions = {}
  ): Promise<ChatResponse> {
    // ========== 提取配置参数 ==========
    // 使用提供的值或默认值
    const {
      temperature = 0.7,    // 温度：控制生成随机性，0-2 之间
      maxTokens = 2000,     // 最大 Token 数
      model = this.defaultModel,  // 模型名称
      tools,                // 工具定义数组 (可选)
    } = options;

    // ========== 构建请求体 ==========
    const requestBody: Record<string, any> = {
      model,
      messages: messages.map(m => this.formatMessage(m)),  // 格式化每条消息
      temperature,
      max_tokens: maxTokens,
    };

    // ========== 添加工具定义 ==========
    // 如果提供了工具，AI 可以选择调用工具
    if (tools && tools.length > 0) {
      requestBody.tools = tools;
      requestBody.tool_choice = 'auto';  // 让 AI 自动决定是否调用工具
    }

    // ========== 发送请求 ==========
    // 完整的 API 端点: {baseUrl}/chat/completions
    const url = `${this.baseUrl}/chat/completions`;
    
    // 记录请求日志 (调试用)
    logger.logRequest(url, requestBody);

    // 使用 fetch 发送 POST 请求
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,  // Bearer Token 认证
      },
      body: JSON.stringify(requestBody),
    });

    // ========== 错误处理 ==========
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    // ========== 解析响应 ==========
    const data = (await response.json()) as OpenAIResponse;
    
    // 记录响应日志
    logger.logResponse(url, data);
    
    // 转换为内部格式并返回
    return this.parseResponse(data);
  }

  /**
   * 流式聊天
   * 
   * 使用 Server-Sent Events (SSE) 流式获取 AI 响应
   * 适用于需要实时展示 AI 回复的场景
   * 
   * 实现原理：
   * 1. 发送请求时设置 stream: true
   * 2. 逐块读取响应体
   * 3. 解析每个 SSE 消息块
   * 4. yield 每个内容块给调用者
   * 5. 直到收到 [DONE] 标记结束
   * 
   * @param messages - 消息数组
   * @param options - 可选配置
   * @returns {AsyncGenerator<string>} 异步生成器，逐块返回内容
   */
  async *chatStream(
    messages: ChatMessage[],
    options: ChatOptions = {}
  ): AsyncGenerator<string, void, unknown> {
    const {
      temperature = 0.7,
      maxTokens = 2000,
      model = this.defaultModel,
    } = options;

    // 构建请求体，设置 stream: true
    const url = `${this.baseUrl}/chat/completions`;
    const requestBody = {
      model,
      messages: messages.map(m => this.formatMessage(m)),
      temperature,
      max_tokens: maxTokens,
      stream: true,  // 关键：启用流式响应
    };
    
    logger.logRequest(url, requestBody);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    // ========== 获取响应流 ==========
    // response.body 是一个 ReadableStream
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();  // 解码二进制数据
    let buffer = '';                    // 缓冲区，存储未处理的数据
    const streamData: string[] = [];    // 存储所有响应数据 (日志用)

    // ========== 循环读取流数据 ==========
    while (true) {
      // 读取一块数据
      const { done, value } = await reader.read();
      if (done) break;  // 流已结束

      // 解码并追加到缓冲区
      buffer += decoder.decode(value, { stream: true });
      
      // 按行分割
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';  // 保留最后一行 (可能不完整)

      // ========== 处理每一行 ==========
      for (const line of lines) {
        const trimmed = line.trim();
        
        // SSE 格式: data: {...}
        if (trimmed.startsWith('data: ')) {
          const data = trimmed.slice(6);  // 去掉 'data: ' 前缀
          streamData.push(data);
          
          // ========== 检查结束标记 ==========
          if (data === '[DONE]') {
            logger.logResponse(url, streamData);
            return;  // 流式响应结束
          }

          // ========== 解析并 yield 内容 ==========
          try {
            const parsed = JSON.parse(data);
            // OpenAI 流式响应的格式: choices[0].delta.content
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              yield content;  // 返回内容块
            }
          } catch {}
        }
      }
    }
    
    logger.logResponse(url, streamData);
  }

  /**
   * 格式化消息
   * 
   * 将内部 ChatMessage 格式转换为 OpenAI API 格式
   * 
   * @param message - 内部消息格式
   * @returns {Record<string, any>} OpenAPI API 消息格式
   */
  private formatMessage(message: ChatMessage): Record<string, any> {
    const formatted: Record<string, any> = {
      role: message.role,
      content: message.content,
    };

    // 添加可选字段
    if (message.name) formatted.name = message.name;
    if (message.toolCallId) formatted.tool_call_id = message.toolCallId;
    if (message.toolCalls) formatted.tool_calls = message.toolCalls;

    return formatted;
  }

  /**
   * 解析 API 响应
   * 
   * 将 OpenAI API 响应转换为内部 ChatResponse 格式
   * 
   * @param data - OpenAI API 响应数据
   * @returns {ChatResponse} 内部响应格式
   */
  private parseResponse(data: OpenAIResponse): ChatResponse {
    // 获取第一个 choice (通常只有一个)
    const choice = data.choices[0];
    const message = choice.message;

    // 构建响应对象
    const response: ChatResponse = {
      content: message.content || '',                    // AI 回复内容
      finishReason: choice.finish_reason as 'stop' | 'length' | 'tool_calls',  // 结束原因
      usage: data.usage ? {                              // Token 使用量
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      } : undefined,
    };

    // ========== 处理工具调用 ==========
    // 如果 AI 调用了工具，解析工具调用信息
    if (message.tool_calls && message.tool_calls.length > 0) {
      response.toolCalls = message.tool_calls.map((tc: any) => ({
        id: tc.id,                      // 工具调用 ID
        type: 'function' as const,      // 调用类型
        function: {
          name: tc.function.name,       // 工具名称
          arguments: tc.function.arguments,  // 工具参数 (JSON 字符串)
        },
      }));
    }

    return response;
  }
}

/**
 * OpenAI API 响应格式定义
 * 
 * 这是 OpenAI Chat Completions API 的响应格式
 * 用于类型检查和解析
 */
interface OpenAIResponse {
  choices: Array<{
    message: {
      content?: string;
      tool_calls?: Array<{
        id: string;
        type: string;
        function: { name: string; arguments: string };
      }>;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}