import OpenAI from 'openai';
import {
  ChatMessage,
  ChatOptions,
  ChatResponse,
  ToolDefinition,
} from './ai.types.js';
import { logger } from '../logger/index.js';

export interface OpenAIConfig {
  apiKey: string;
  baseUrl?: string;
  defaultModel?: string;
}

export class OpenAIProvider {
  private client: OpenAI;

  constructor(config: OpenAIConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl || 'https://api.openai.com/v1',
      defaultHeaders: {
        'HTTP-Referer': 'https://www.homecommunity.cn',
        'X-Title': 'txcode',
        'X-OpenRouter-Title': 'txcode',
      },
    });
    this.defaultModel = config.defaultModel || 'gpt-4';
  }

  private defaultModel: string;

  async chat(
    messages: ChatMessage[],
    options: ChatOptions = {}
  ): Promise<ChatResponse> {
    const {
      temperature = 0.7,
      maxTokens = 8192,
      model = this.defaultModel,
      tools,
      abortSignal,
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

    const url = `${this.client.baseURL}/chat/completions`;
    logger.logRequest(url, requestBody);

    const response = await this.client.chat.completions.create(requestBody as any, { signal: abortSignal });

    logger.logResponse(url, response);

    return this.parseResponse(response);
  }

  async *chatStream(
    messages: ChatMessage[],
    options: ChatOptions = {}
  ): AsyncGenerator<string, void, unknown> {
    const {
      temperature = 0.7,
      maxTokens = 2000,
      model = this.defaultModel,
    } = options;

    const url = `${this.client.baseURL}/chat/completions`;
    const requestBody = {
      model,
      messages: messages.map(m => this.formatMessage(m)),
      temperature,
      max_tokens: maxTokens,
      stream: true,
    };

    logger.logRequest(url, requestBody);

    const response = await this.client.chat.completions.create(requestBody as any) as any;

    if (!response.body) {
      throw new Error('No response body');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

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
          if (data === '[DONE]') return;
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) yield content;
          } catch { }
        }
      }
    }
  }

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

  private parseResponse(response: OpenAI.Chat.Completions.ChatCompletion): ChatResponse {
    const choice = response.choices[0];
    const message = choice.message;

    const responseData: ChatResponse = {
      content: message.content || '',
      finishReason: choice.finish_reason as 'stop' | 'length' | 'tool_calls',
      usage: response.usage ? {
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens,
      } : undefined,
    };

    if ((message as any).reasoning) {
      responseData.reasoning = (message as any).reasoning;
    } else if ((response as any).reasoning) {
      responseData.reasoning = (response as any).reasoning;
    }

    if (message.tool_calls && message.tool_calls.length > 0) {
      responseData.toolCalls = message.tool_calls.map((tc: any) => ({
        id: tc.id,
        type: 'function' as const,
        function: {
          name: tc.function.name,
          arguments: tc.function.arguments,
        },
      }));
    }

    return responseData;
  }
}