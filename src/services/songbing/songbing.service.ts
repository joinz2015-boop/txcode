import { configService } from '../config/index.js';
import { providerAuthRepository } from '../../repository/provider_auth.repository.js';
import { configRepository } from '../../repository/config.repository.js';
import txConfig from '../../config/tx.config.js';

const PROVIDER_NAME = '自建AI平台';
const CONFIG_KEY_PLATFORM_URL = 'songbing.platformUrl';

interface StartAuthResult {
  key: string;
  auth_url: string;
}

interface VerifyAuthResult {
  active: boolean;
  syncedModels: number;
}

interface SyncModelsResult {
  count: number;
}

interface GenerateAppkeyResponse {
  code: number;
  message: string;
  data: {
    key: string;
    auth_url: string;
  };
}

interface VerifyAppkeyResponse {
  code: number;
  message: string;
  data: {
    active: boolean;
  };
}

interface SceneModel {
  model_id: number;
  model_name: string;
  model_code: string;
  description: string;
  provider_name: string;
  input_price_per_million: number;
  output_price_per_million: number;
  cache_price: number;
  pricing_strategy_name: string;
}

interface SceneItem {
  scene_id: number;
  scene_code: string;
  scene_name: string;
  description: string;
  models: SceneModel[];
}

interface SceneModelsResponse {
  code: number;
  message: string;
  data: SceneItem[];
}

export class SongbingService {
  getConfig() {
    const platformUrl = configService.get<string>(CONFIG_KEY_PLATFORM_URL) || txConfig.songbing.platformUrl || '';
    return { platformUrl };
  }

  private getPlatformUrl(): string {
    const { platformUrl } = this.getConfig();
    if (!platformUrl) {
      throw new Error('未配置松饼AI平台地址');
    }
    return platformUrl;
  }

  saveConfig(config: { platformUrl: string }) {
    configService.set(CONFIG_KEY_PLATFORM_URL, config.platformUrl);
    return this.getConfig();
  }

  async startAuth(platformUrl: string): Promise<StartAuthResult> {
    this.saveConfig({ platformUrl });

    const res = await fetch(`${platformUrl}/api/appkey/generate_appkey`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    if (!res.ok) {
      throw new Error(`生成认证Key失败: HTTP ${res.status}`);
    }

    const json = (await res.json()) as GenerateAppkeyResponse;
    if (json.code !== 200) {
      throw new Error(`生成认证Key失败: ${json.message}`);
    }

    const { key, auth_url } = json.data;

    providerAuthRepository.upsert({
      id: PROVIDER_NAME,
      providerName: PROVIDER_NAME,
      key,
      authUrl: auth_url,
      active: false,
    });

    return { key, auth_url };
  }

  async verifyAuth(key: string): Promise<VerifyAuthResult> {
    const platformUrl = this.getPlatformUrl();

    const res = await fetch(`${platformUrl}/api/appkey/verify_appkey`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key }),
    });

    if (!res.ok) {
      throw new Error(`验证Key失败: HTTP ${res.status}`);
    }

    const json = (await res.json()) as VerifyAppkeyResponse;
    if (json.code !== 200) {
      return { active: false, syncedModels: 0 };
    }

    if (!json.data?.active) {
      return { active: false, syncedModels: 0 };
    }

    providerAuthRepository.upsert({
      id: PROVIDER_NAME,
      providerName: PROVIDER_NAME,
      key,
      authUrl: '',
      active: true,
    });

    const provider = configRepository.listProviders().find(p => p.name === PROVIDER_NAME);
    const providerId = provider?.id || configRepository.insertProvider({
      name: PROVIDER_NAME,
      apiKey: key,
      baseUrl: platformUrl + '/api/v1',
      enabled: true,
    });

    let syncedModels = 0;
    try {
      syncedModels = await this.syncModelsInternal(providerId, platformUrl);
    } catch {
      // 模型同步失败不影响认证成功
    }

    return { active: true, syncedModels };
  }

  async cancelAuth(): Promise<void> {
    providerAuthRepository.delete(PROVIDER_NAME);

    const provider = configRepository.listProviders().find(p => p.name === PROVIDER_NAME);
    if (provider) {
      const models = configRepository.listModels(provider.id);
      for (const m of models) {
        configRepository.deleteModel(m.id);
      }
      configRepository.deleteProvider(provider.id);
    }
  }

  async syncModels(): Promise<SyncModelsResult> {
    const provider = configRepository.listProviders().find(p => p.name === PROVIDER_NAME);
    if (!provider) {
      throw new Error('未找到自建AI平台提供商，请先完成认证');
    }
    const platformUrl = this.getPlatformUrl();
    const count = await this.syncModelsInternal(provider.id, platformUrl);
    return { count };
  }

  private async syncModelsInternal(providerId: string, platformUrl: string): Promise<number> {
    const res = await fetch(`${platformUrl}/api/common/scene_models`, {
      method: 'GET',
    });

    if (!res.ok) {
      throw new Error(`获取模型列表失败: HTTP ${res.status}`);
    }

    const json = (await res.json()) as SceneModelsResponse;
    if (json.code !== 200) {
      throw new Error(`获取模型列表失败: ${json.message}`);
    }

    const scenes = json.data || [];
    const allModels: SceneModel[] = [];
    for (const scene of scenes) {
      if (scene.models && Array.isArray(scene.models)) {
        allModels.push(...scene.models);
      }
    }

    if (allModels.length === 0) {
      return 0;
    }

    const existingModels = configRepository.listModels(providerId);
    const existingNames = new Set(existingModels.map(m => m.name));

    let count = 0;
    for (const m of allModels) {
      const modelName = m.model_name;
      if (!existingNames.has(modelName)) {
        configRepository.insertModel({
          providerId,
          name: modelName,
          contextWindow: 4096,
          maxOutputTokens: 4096,
          enabled: true,
        });
        count++;
      }
    }

    return count;
  }
}

export const songbingService = new SongbingService();
