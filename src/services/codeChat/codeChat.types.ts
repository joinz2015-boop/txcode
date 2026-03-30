export interface ChatInput {
  message: string;
  sessionId?: string;
  projectPath?: string;
  abortSignal?: AbortSignal;
  modelName?: string;
  onStep?: (step: Step, iteration: number) => void;
  onCompact?: (info: { beforeTokens: number; afterTokens: number }) => void;
}

export interface ChatOptions {
  sessionId: string;
  projectPath?: string;
  abortSignal?: AbortSignal;
  modelName?: string;
  onStep?: (step: Step, iteration: number) => void;
  onCompact?: (info: { beforeTokens: number; afterTokens: number }) => void;
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
  actions?: Action[];
  observation?: string;
}

export interface Action {
  name: string;
  args?: Record<string, any>;
  result?: string;
}
