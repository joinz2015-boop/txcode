import { ChatMessage, ToolDefinition } from '../ai.types.js';

export interface ProviderResponse {
  content?: string;
  reasoning?: string;
  toolCalls?: ProviderToolCall[];
  finishReason: 'stop' | 'length' | 'tool_calls';
  usage?: ProviderTokenUsage;
}

export interface ProviderToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
}

export interface ProviderTokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface ProviderRunOptions {
  onStep?: (step: ProviderStep, iteration: number, usage?: ProviderTokenUsage) => void;
  historyMessages?: ChatMessage[];
}

export interface ProviderStep {
  reasoning?: string;
  toolCalls: ProviderToolCall[];
  results: ProviderToolResult[];
  finalAnswer?: string;
}

export interface ProviderToolResult {
  name: string;
  success: boolean;
  output?: string;
  error?: string;
}

export interface AIProvider {
  name: string;
  
  run(
    userMessage: string,
    options?: ProviderRunOptions
  ): Promise<ProviderRunResult>;
  
  getType(): string;
}

export interface ProviderRunResult {
  answer: string;
  steps: ProviderStep[];
  iterations: number;
  success: boolean;
  error?: string;
  usage?: ProviderTokenUsage;
}
