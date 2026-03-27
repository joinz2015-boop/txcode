export interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  name?: string;
  toolCallId?: string;
  toolCalls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  model?: string;
  tools?: ToolDefinition[];
  abortSignal?: AbortSignal;
  sessionId?: string;
  modelName?: string;
}

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, any>;
  };
}

export interface ChatResponse {
  content: string;
  reasoning?: string;
  finishReason: 'stop' | 'length' | 'tool_calls';
  toolCalls?: ToolCall[];
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface ReActState {
  thought: string;
  actions: { actionName: string; actionInput: any }[];
  observation?: string;
  answer?: string;
  keepContext?: boolean;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export { ReActStep, ReActResult } from './react/react.types.js';
