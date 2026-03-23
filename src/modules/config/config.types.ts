/**
 * Config 模块类型定义
 * 
 * Provider: AI 服务商配置
 * Model: 模型配置
 */

export interface ProviderInput {
  id?: string;
  name: string;
  apiKey: string;
  baseUrl?: string;
  enabled?: boolean;
  isDefault?: boolean;
}

export interface Provider {
  id: string;
  name: string;
  apiKey: string;
  baseUrl: string;
  enabled: boolean;
  isDefault: boolean;
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

export const PREDEFINED_MODELS: Partial<Model>[] = [
  { id: 'gpt-4o', contextWindow: 128000, maxOutputTokens: 4096, supportsVision: true, supportsTools: true },
  { id: 'gpt-4o-mini', contextWindow: 128000, maxOutputTokens: 4096, supportsVision: true, supportsTools: true },
  { id: 'gpt-4-turbo', contextWindow: 128000, maxOutputTokens: 4096, supportsVision: true, supportsTools: true },
  { id: 'gpt-4', contextWindow: 8192, maxOutputTokens: 4096, supportsVision: false, supportsTools: true },
  { id: 'claude-3-opus', contextWindow: 200000, maxOutputTokens: 4096, supportsVision: true, supportsTools: true },
  { id: 'claude-3-sonnet', contextWindow: 200000, maxOutputTokens: 4096, supportsVision: true, supportsTools: true },
  { id: 'claude-3-haiku', contextWindow: 200000, maxOutputTokens: 4096, supportsVision: true, supportsTools: true },
  { id: 'claude-3.5-sonnet', contextWindow: 200000, maxOutputTokens: 8192, supportsVision: true, supportsTools: true },
  { id: 'claude-4-sonnet', contextWindow: 200000, maxOutputTokens: 8192, supportsVision: true, supportsTools: true },
  { id: 'claude-4-opus', contextWindow: 200000, maxOutputTokens: 4096, supportsVision: true, supportsTools: true },
  { id: 'deepseek-chat', contextWindow: 64000, maxOutputTokens: 4096, supportsVision: false, supportsTools: true },
  { id: 'deepseek-coder', contextWindow: 16000, maxOutputTokens: 4096, supportsVision: false, supportsTools: true },
];