/**
 * OpenAI Provider
 * 
 * 职责：
 * - 与 OpenAI API 交互
 * - 支持流式和非流式响应
 * - 支持 Tool Calls
 */

import {
  ChatMessage,
  ChatOptions,
  ChatResponse,
  ToolDefinition,
  ToolCall,
} from './ai.types.js';
import { logger } from '../logger/index.js';

export interface OpenAIConfig {
  apiKey: string;
  baseUrl?: string;
  defaultModel?: string;
}

export class OpenAIProvider {
  private apiKey: string;
  private baseUrl: string;
  private defaultModel: string;

  constructor(config: OpenAIConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.openai.com/v1';
    this.defaultModel = config.defaultModel || 'gpt-4';
  }

  /**
   * 发送聊天请求
   */
  async chat(
    messages: ChatMessage[],
    options: ChatOptions = {}
  ): Promise<ChatResponse> {
    const {
      temperature = 0.7,
      maxTokens = 2000,
      model = this.defaultModel,
      tools,
    } = options;

    const requestBody: Record<string, any> = {
      model,
      messages: messages.map(m => this.formatMessage(m)),
      temperature,
      max_tokens: maxTokens,
    };

    if (tools && tools.length > 0) {
      requestBody.tools = tools;
      requestBody.tool_choice = 'auto';
    }

    const url = `${this.baseUrl}/chat/completions`;
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
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    const data = (await response.json()) as OpenAIResponse;
    logger.logResponse(url, data);
    return this.parseResponse(data);
  }

  /**
   * 流式聊天
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

    const url = `${this.baseUrl}/chat/completions`;
    const requestBody = {
      model,
      messages: messages.map(m => this.formatMessage(m)),
      temperature,
      max_tokens: maxTokens,
      stream: true,
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

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';
    const streamData: string[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data: ')) {
          const data = trimmed.slice(6);
          streamData.push(data);
          if (data === '[DONE]') {
            logger.logResponse(url, streamData);
            return;
          }

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) yield content;
          } catch {}
        }
      }
    }
    logger.logResponse(url, streamData);
  }

  /**
   * 格式化消息
   */
  private formatMessage(message: ChatMessage): Record<string, any> {
    const formatted: Record<string, any> = {
      role: message.role,
      content: message.content,
    };

    if (message.name) formatted.name = message.name;
    if (message.toolCallId) formatted.tool_call_id = message.toolCallId;
    if (message.toolCalls) formatted.tool_calls = message.toolCalls;

    return formatted;
  }

  /**
   * 解析响应
   */
  private parseResponse(data: OpenAIResponse): ChatResponse {
    const choice = data.choices[0];
    const message = choice.message;

    const response: ChatResponse = {
      content: message.content || '',
      finishReason: choice.finish_reason as 'stop' | 'length' | 'tool_calls',
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      } : undefined,
    };

    if (message.tool_calls && message.tool_calls.length > 0) {
      response.toolCalls = message.tool_calls.map((tc: any) => ({
        id: tc.id,
        type: 'function' as const,
        function: {
          name: tc.function.name,
          arguments: tc.function.arguments,
        },
      }));
    }

    return response;
  }
}

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