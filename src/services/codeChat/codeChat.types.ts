export interface ChatInput {
  message: string;
  sessionId?: string;
  projectPath?: string;
  abortSignal?: AbortSignal;
  modelName?: string;
  onStep?: (step: Step, iteration: number, usage?: any) => void;
  onCompact?: (info: { beforeTokens: number; afterTokens: number; summary?: string }) => void;
}

export interface ChatOptions {
  sessionId: string;
  projectPath?: string;
  abortSignal?: AbortSignal;
  modelName?: string;
  onStep?: (step: Step, iteration: number, usage?: any) => void;
  onCompact?: (info: { beforeTokens: number; afterTokens: number; summary?: string }) => void;
}

export interface ChatResult {
  answer: string;
  iterations: number;
  success: boolean;
  usage?: any;
  reactSteps?: any[];
  sessionId?: string;
}

export interface Step {
  thought?: string;
  toolCalls?: ToolCall[];
  success?: boolean;
}

export interface ToolCall {
  id?: string;
  type?: string;
  function: {
    name: string;
    arguments: string | Record<string, any>;
  };
}
