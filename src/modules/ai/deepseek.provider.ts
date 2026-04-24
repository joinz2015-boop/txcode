import OpenAI from 'openai';
import {
  ChatMessage,
  ChatOptions,
  ChatResponse,
  ToolDefinition,
  BaseProvider,
} from './ai.types.js';
import { logger } from '../logger/index.js';
import { aiLogService } from './ai-log.service.js';

export interface DeepSeekConfig {
  apiKey: string;
  baseUrl?: string;
  defaultModel?: string;
}

export class DeepSeekProvider implements BaseProvider {
  private client: OpenAI;

  constructor(config: DeepSeekConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl || 'https://api.deepseek.com/v1',
    });
    this.defaultModel = config.defaultModel || 'deepseek-chat';
  }

  private defaultModel: string;

  getModel(): string {
    return this.defaultModel;
  }

  getBaseUrl(): string {
    return this.client.baseURL;
  }

  async chat(
    messages: ChatMessage[],
    options: ChatOptions = {}
  ): Promise<ChatResponse> {
    const {
      maxTokens = 8192,
      model = this.defaultModel,
      tools,
      abortSignal,
    } = options;

    console.log('DeepSeekProvider chat called with model:', model);
    const requestBody: Record<string, any> = {
      model,
      messages: messages.map(m => this.formatMessage(m)),
      max_tokens: maxTokens,
      thinking: {
        type: "disabled",
      },
    //reasoning_effort: "high",

    };

    if (tools && tools.length > 0) {
      requestBody.tools = tools;
      requestBody.tool_choice = 'auto';
    }

    const url = `${this.client.baseURL}/chat/completions`;
    logger.logRequest(url, requestBody);
    const requestStartTime = Date.now();

    const response = await this.client.chat.completions.create(requestBody as any, { signal: abortSignal });

    logger.logResponse(url, response);

    const requestEndTime = Date.now();
    const durationMs = requestEndTime - requestStartTime;
    if (options.sessionId) {
      aiLogService.logAiCall({
        model_address: this.client.baseURL || '',
        model_name: options.modelName || model,
        request_time: new Date(requestStartTime),
        response_time: new Date(requestEndTime),
        duration_ms: durationMs,
        input_tokens: response.usage?.prompt_tokens || 0,
        output_tokens: response.usage?.completion_tokens || 0,
        cost: ((response.usage?.prompt_tokens || 0) * 0.00015 + (response.usage?.completion_tokens || 0) * 0.0006) / 1000,
        call_type: tools && tools.length > 0 ? 'tool_call' : 'normal',
        session_id: options.sessionId,
      });
    }

    return this.parseResponse(response);
  }

  async *chatStream(
    messages: ChatMessage[],
    options: ChatOptions = {}
  ): AsyncGenerator<string, void, unknown> {
    const {
      maxTokens = 2000,
      model = this.defaultModel,
    } = options;

    const url = `${this.client.baseURL}/chat/completions`;
    const requestBody = {
      model,
      messages: messages.map(m => this.formatMessage(m)),
      max_tokens: maxTokens,
      stream: true,
      extra_body: {
        thinking: {
          type: "disabled",
        },
      },
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
    //if ((message as any).reasoning) formatted.reasoning_content = (message as any).reasoning;

    return formatted;
  }

  private parseResponse(response: OpenAI.Chat.Completions.ChatCompletion): ChatResponse {
    if (!response.choices || response.choices.length === 0) {
      throw new Error('Invalid response: no choices available');
    }
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

    if ((message as any).reasoning_content) {
      responseData.reasoning = (message as any).reasoning_content;
    } else if ((message as any).reasoning) {
      responseData.reasoning = (message as any).reasoning;
    } else if ((response as any).reasoning) {
      responseData.reasoning = (response as any).reasoning;
    } else if (message.content) {
      responseData.reasoning = message.content;
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