export interface ToolParameterProperty {
  type: string;
  description: string;
}

export interface ToolParameters {
  type: 'object';
  properties: Record<string, ToolParameterProperty>;
  required: string[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: ToolParameters;
}

export interface ActionCall {
  actionName: string;
  actionInput: Record<string, any>;
}

export interface ReActStep {
  thought: string;
  actions: ActionCall[];
  observation?: any;
  error?: string;
  keepContext?: boolean;
  final_answer?: string;
}

export interface ReActResult {
  answer: string;
  steps: ReActStep[];
  iterations: number;
  success: boolean;
  error?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface ParsedBlock {
  type: 'step' | 'observation' | 'content';
  data?: any;
  contentKey?: string;
  content?: string;
}

export interface SkillInfo {
  path: string;
  name: string;
  description: string;
}
