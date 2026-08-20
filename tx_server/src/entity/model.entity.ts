export interface ModelRow {
  id: string;
  provider_id: string;
  name: string;
  context_window: number;
  max_output_tokens: number;
  supports_vision: number;
  supports_tools: number;
  enabled: number;
  created_at: string;
  updated_at: string;
}

export interface Model {
  id: string;
  providerId: string;
  name: string;
  contextWindow: number;
  maxOutputTokens: number;
  supportsVision: boolean;
  supportsTools: boolean;
  enabled: boolean;
}

export interface ModelInput {
  id?: string;
  providerId: string;
  name: string;
  contextWindow?: number;
  maxOutputTokens?: number;
  supportsVision?: boolean;
  supportsTools?: boolean;
  enabled?: boolean;
}
