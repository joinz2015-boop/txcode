import { OpenAIProvider } from './openai.provider.js';
import { DeepSeekProvider } from './deepseek.provider.js';
import { KimiProvider } from './kimi.provider.js';
import { BaseProvider } from '../../../entity/ai.entity.js';
import { ProxyAgent } from 'undici';
import { configService } from '../../../services/config/config.service.js';

export interface ProviderConfig {
  apiKey: string;
  baseUrl?: string;
  defaultModel?: string;
}

export function createProvider(config: ProviderConfig): BaseProvider {
  const proxyConfig = configService.getProxyConfig();
  const fetchOptions: Record<string, any> = {};

  if (proxyConfig && proxyConfig.enabled && proxyConfig.host && proxyConfig.port) {
    const scheme = proxyConfig.type === 'socks5' ? 'socks5://' : 'http://';
    const proxyUrl = `${scheme}${proxyConfig.host}:${proxyConfig.port}`;
    fetchOptions.dispatcher = new ProxyAgent(proxyUrl);
  }

  const baseUrl = config.baseUrl || '';
  const model = config.defaultModel || '';

  if (baseUrl.includes('deepseek.com') || baseUrl.includes('api.deepseek.com')) {
    return new DeepSeekProvider({
      apiKey: config.apiKey,
      baseUrl: baseUrl,
      defaultModel: config.defaultModel,
      fetchOptions,
    });
  }

  if(model.toLowerCase().includes('deepseek')) {
    return new DeepSeekProvider({
      apiKey: config.apiKey,
      baseUrl: baseUrl,
      defaultModel: config.defaultModel,
      fetchOptions,
    });
  }

  if (baseUrl.includes('moonshot.cn')) {
    return new KimiProvider({
      apiKey: config.apiKey,
      baseUrl: baseUrl,
      defaultModel: config.defaultModel,
      fetchOptions,
    });
  }

  if (model.toLowerCase().includes('kimi-')) {
    return new KimiProvider({
      apiKey: config.apiKey,
      baseUrl: baseUrl,
      defaultModel: config.defaultModel,
      fetchOptions,
    });
  }

  return new OpenAIProvider({
    apiKey: config.apiKey,
    baseUrl: baseUrl,
    defaultModel: config.defaultModel,
    fetchOptions,
  });
}

export function getProvider(modelName?: string): BaseProvider {
  const model = modelName || configService.getDefaultModel();
  const providerConfig = configService.getModelProvider(model);
  if (!providerConfig) {
    throw new Error(`Provider not found for model: ${model}`);
  }
  return createProvider({
    apiKey: providerConfig.apiKey,
    baseUrl: providerConfig.baseUrl,
    defaultModel: model,
  });
}
