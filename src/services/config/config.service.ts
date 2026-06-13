import { configRepository, ProviderRow, ModelRow, ProxyRow, DingTalkRow } from '../../repository/config.repository.js';
import type { Provider, ProviderInput } from '../../entity/provider.entity.js';
import type { Model, ModelInput } from '../../entity/model.entity.js';
import type { ProxyConfig } from '../../entity/config.entity.js';
import { v4 as uuidv4 } from 'uuid';

export class ConfigService {
  private repo = configRepository;

  getProviders(): Provider[] {
    return this.repo.listProviders().map(this.rowToProvider);
  }

  getProvider(id: string): Provider | undefined {
    const row = this.repo.getProvider(id);
    return row ? this.rowToProvider(row) : undefined;
  }

  getDefaultProvider(): Provider | undefined {
    const row = this.repo.getDefaultProvider();
    return row ? this.rowToProvider(row) : undefined;
  }

  addProvider(provider: ProviderInput): string {
    return this.repo.insertProvider({
      id: provider.id,
      name: provider.name,
      apiKey: provider.apiKey,
      baseUrl: provider.baseUrl,
      enabled: provider.enabled,
      isDefault: provider.isDefault,
    });
  }

  updateProvider(id: string, data: Partial<Provider>): void {
    this.repo.updateProvider(id, {
      name: data.name,
      apiKey: data.apiKey,
      baseUrl: data.baseUrl,
      enabled: data.enabled,
      isDefault: data.isDefault,
    });
  }

  deleteProvider(id: string): void {
    this.repo.deleteProvider(id);
  }

  setDefaultProvider(id: string): void {
    this.repo.setDefaultProvider(id);
  }

  getModels(providerId: string): Model[] {
    return this.repo.listModels(providerId).map(this.rowToModel);
  }

  getAllModels(): Model[] {
    return this.repo.allModels().map(this.rowToModel);
  }

  addModel(model: ModelInput): string {
    return this.repo.insertModel({
      id: model.id,
      providerId: model.providerId,
      name: model.name,
      contextWindow: model.contextWindow,
      maxOutputTokens: model.maxOutputTokens,
      supportsVision: model.supportsVision,
      supportsTools: model.supportsTools,
      enabled: model.enabled,
    });
  }

  updateModel(id: string, data: Partial<Model>): void {
    this.repo.updateModel(id, {
      name: data.name,
      enabled: data.enabled,
    });
  }

  deleteModel(id: string): void {
    this.repo.deleteModel(id);
  }

  get<T = string>(key: string): T | undefined {
    const value = this.repo.getConfig(key);
    if (!value) return undefined;
    try { return JSON.parse(value) as T; } catch { return value as unknown as T; }
  }

  set(key: string, value: unknown): void {
    const strValue = typeof value === 'string' ? value : JSON.stringify(value);
    this.repo.setConfig(key, strValue);
  }

  getModelProvider(modelName: string): Provider | undefined {
    const row = this.repo.getModelProvider(modelName);
    return row ? this.rowToProvider(row) : undefined;
  }

  getDefaultModel(): string {
    const existing = this.get<string>('defaultModel');
    if (existing) return existing;
    const models = this.getAllModels();
    if (models.length === 0) throw new Error('无可用模型，请先配置模型');
    const randomModel = models[Math.floor(Math.random() * models.length)];
    this.set('defaultModel', randomModel.name);
    return randomModel.name;
  }

  initDefaultModel(): void {
    const existing = this.get<string>('defaultModel');
    if (existing) return;
    const models = this.getAllModels();
    if (models.length === 0) {
      console.warn('[ConfigService] No models available, skipping default model initialization');
      return;
    }
    const randomModel = models[Math.floor(Math.random() * models.length)];
    this.set('defaultModel', randomModel.name);
    console.log(`[ConfigService] Default model initialized: ${randomModel.name}`);
  }

  getDingdingConfig(): { enabled: boolean; clientId: string; clientSecret: string; botName: string } {
    const row = this.repo.getDingTalkConfig();
    if (!row) return { enabled: false, clientId: '', clientSecret: '', botName: '' };
    return { enabled: Boolean(row.enabled), clientId: row.client_id || '', clientSecret: row.client_secret || '', botName: row.bot_name || '' };
  }

  getProxyConfig(): ProxyConfig | null {
    const row = this.repo.getProxyConfig();
    if (!row) return null;
    return { enabled: Boolean(row.enabled), type: row.type as 'http' | 'socks5', host: row.host || '', port: row.port || 1080 };
  }

  updateProxyConfig(data: Partial<ProxyConfig>): void {
    this.repo.updateProxyConfig({
      enabled: data.enabled,
      type: data.type,
      host: data.host,
      port: data.port,
    });
  }

  updateDingdingConfig(data: { enabled?: boolean; clientId?: string; clientSecret?: string; botName?: string }): void {
    this.repo.updateDingTalkConfig({
      enabled: data.enabled,
      clientId: data.clientId,
      clientSecret: data.clientSecret,
      botName: data.botName,
    });
  }

  private rowToProvider(row: ProviderRow): Provider {
    return { id: row.id, name: row.name, apiKey: row.api_key, baseUrl: row.base_url, enabled: Boolean(row.enabled), isDefault: Boolean(row.is_default) };
  }

  private rowToModel(row: ModelRow): Model {
    return {
      id: row.id, providerId: row.provider_id, name: row.name,
      contextWindow: row.context_window || 4096, maxOutputTokens: row.max_output_tokens || 4096,
      supportsVision: Boolean(row.supports_vision), supportsTools: row.supports_tools !== 0, enabled: Boolean(row.enabled),
    };
  }
}

export const configService = new ConfigService();
