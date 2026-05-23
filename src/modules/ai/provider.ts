import { OpenAIProvider } from './openai.provider.js';
import { DeepSeekProvider } from './deepseek.provider.js';
import { BaseProvider } from './ai.types.js';

export interface ProviderConfig {
  apiKey: string;
  baseUrl?: string;
  defaultModel?: string;
}

export function createProvider(config: ProviderConfig): BaseProvider {
  const baseUrl = config.baseUrl || '';
  const model = config.defaultModel || '';

  if (baseUrl.includes('deepseek.com') || baseUrl.includes('api.deepseek.com')) {
    return new DeepSeekProvider({
      apiKey: config.apiKey,
      baseUrl: baseUrl,
      defaultModel: config.defaultModel,
    });
  }

  if(model.toLowerCase().includes('deepseek')) {
    return new DeepSeekProvider({
      apiKey: config.apiKey,
      baseUrl: baseUrl,
      defaultModel: config.defaultModel,
    });
  }

  return new OpenAIProvider({
    apiKey: config.apiKey,
    baseUrl: baseUrl,
    defaultModel: config.defaultModel,
  });
}