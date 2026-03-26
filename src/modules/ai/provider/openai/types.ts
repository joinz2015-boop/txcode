import { ChatMessage } from '../../ai.types.js';
import { ToolDefinition } from '../../ai.types.js';

export interface OpenAIAgentConfig {
  provider: any;
  toolService: any;
  maxIterations?: number;
  projectPath?: string;
  sessionId?: string;
}

export interface OpenAIAgentRunOptions {
  onStep?: (step: any, iteration: number, usage?: any) => void;
  historyMessages?: ChatMessage[];
}

export interface OpenAIChatOptions {
  temperature?: number;
  maxTokens?: number;
  model?: string;
  tools?: ToolDefinition[];
}
