import OpenAI from 'openai';
import {
  ChatMessage,
  ChatOptions,
  ChatResponse,
  ToolDefinition,
  BaseProvider,
  MultimodalContent,
} from '../../../entity/ai.entity.js';
import { logger } from '../../../modules/logger/index.js';
import { aiLogService } from '../../../services/ai/ai-log.service.js';
import { resolveImageUrl } from '../../../utils/image_base64.js';

export interface DeepSeekConfig {
  apiKey: string;
  baseUrl?: string;
  defaultModel?: string;
  fetchOptions?: Record<string, any>;
}

export class DeepSeekProvider implements BaseProvider {
  private client: OpenAI;

  constructor(config: DeepSeekConfig) {
    const clientConfig: Record<string, any> = {
      apiKey: config.apiKey,
      baseURL: config.baseUrl || 'https://api.deepseek.com/v1',
    };

    if (config.fetchOptions && Object.keys(config.fetchOptions).length > 0) {
      clientConfig.fetchOptions = config.fetchOptions;
    }

    this.client = new OpenAI(clientConfig);
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
      maxTokens = 65536,
      model = this.defaultModel,
      tools,
      abortSignal,
    } = options;

    const requestBody: Record<string, any> = {
      model,
      messages: await this.resolveMessages(messages),
      max_tokens: maxTokens,
      thinking: {
        type: "enabled",
      },
      reasoning_effort: "max",

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
      messages: await this.resolveMessages(messages),
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
    let content: any = message.content;

    if (Array.isArray(content)) {
      content = content.map(c => {
        if (c.type === 'image_url' && c.image_url) {
          return {
            type: 'image_url',
            image_url: { url: c.image_url.url },
          };
        }
        return c;
      });
    }

    const formatted: Record<string, any> = {
      role: message.role,
      content: content || null,
    };

    if (message.name) formatted.name = message.name;
    if (message.toolCallId) formatted.tool_call_id = message.toolCallId;
    if (message.toolCalls) formatted.tool_calls = message.toolCalls;
    if ((message as any).reasoning) formatted.reasoning_content = (message as any).reasoning;

    if(message.role == 'assistant' &&!formatted.reasoning_content) {
      formatted.reasoning_content = "null";
    }

    return formatted;
  }

  private async resolveContentImages(content: any): Promise<any> {
    if (Array.isArray(content)) {
      const resolved = [];
      for (const c of content) {
        if (c.type === 'image_url' && c.image_url) {
          resolved.push({
            type: 'image_url',
            image_url: { url: await resolveImageUrl(c.image_url.url) },
          });
        } else {
          resolved.push(c);
        }
      }
      return resolved;
    }
    return content;
  }

  private async resolveMessages(messages: ChatMessage[]): Promise<Record<string, any>[]> {
    const resolved: Record<string, any>[] = [];
    for (const m of messages) {
      const formatted = this.formatMessage(m);
      formatted.content = await this.resolveContentImages(m.content);
      resolved.push(formatted);
    }
    return resolved;
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