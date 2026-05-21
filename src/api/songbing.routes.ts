/**
 * 松饼AI 认证 & 模型同步路由
 * 
 * - GET  /api/songbing/config           -> 返回松饼平台配置
 * - POST /api/songbing/auth/start       -> 清理旧数据 + 生成临时Key
 * - POST /api/songbing/auth/verify      -> 轮询验证Key，active=true时自动写入providers/models
 * - POST /api/songbing/sync-models      -> 手动同步模型
 */

import { Router, Request, Response } from 'express';
import { dbService } from '../modules/db/db.service.js';
import { configService } from '../modules/config/config.service.js';
import config, { getSongbingApiBaseUrl } from '../config/tx.config.js';
import { v4 as uuidv4 } from 'uuid';

export const songbingRouter = Router();

const OFFICIAL_PROVIDER_NAME = '自建AI平台';
const OFFICIAL_PROVIDER_ID = 'songbing-official-001';

interface PendingAuth {
  platformUrl: string;
  apiBaseUrl: string;
  realKey?: string;
}

const pendingAuthMap = new Map<string, PendingAuth>();

function getPlatformUrl(customUrl?: string): string {
  return customUrl || config.songbing?.platformUrl;
}

function getApiBaseUrl(customUrl?: string): string {
  if (customUrl) {
    return customUrl.replace(/\/$/, '') + '/api/v1';
  }
  return getSongbingApiBaseUrl();
}

/**
 * GET /api/songbing/config
 */
songbingRouter.get('/config', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      platformUrl: getPlatformUrl(),
      apiBaseUrl: getApiBaseUrl(),
    },
  });
});

/**
 * POST /api/songbing/auth/start
 */
songbingRouter.post('/auth/start', async (req: Request, res: Response) => {
  try {
    const { platformUrl } = req.body || {};
    const resolvedPlatformUrl = platformUrl || getPlatformUrl();
    const resolvedApiBaseUrl = getApiBaseUrl(resolvedPlatformUrl);
    const placeholderKey = `pending_${Date.now()}`;
    const pendingAuthEntry: PendingAuth = {
      platformUrl: resolvedPlatformUrl,
      apiBaseUrl: resolvedApiBaseUrl,
    };
    pendingAuthMap.set(placeholderKey, pendingAuthEntry);

    const result = dbService.transaction(() => {
      dbService.run(
        `DELETE FROM models WHERE provider_id = ? OR provider_id IN (SELECT id FROM providers WHERE name IN (?, ?))`,
        [OFFICIAL_PROVIDER_ID, '松饼AI', OFFICIAL_PROVIDER_NAME]
      );
      dbService.run(
        `DELETE FROM providers WHERE name IN (?, ?)`,
        ['松饼AI', OFFICIAL_PROVIDER_NAME]
      );
      dbService.run(
        `DELETE FROM provider_auth WHERE provider_name IN (?, ?)`,
        ['松饼AI', OFFICIAL_PROVIDER_NAME]
      );
      
      configService.addProvider({
        id: OFFICIAL_PROVIDER_ID,
        name: OFFICIAL_PROVIDER_NAME,
        apiKey: placeholderKey,
        baseUrl: resolvedApiBaseUrl,
        enabled: false,
        isDefault: false,
      });
    });

    const resp = await fetch(`${resolvedPlatformUrl}/api/appkey/generate_appkey`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });

    if (!resp.ok) {
      return res.status(502).json({ success: false, error: `generate_appkey 失败: ${resp.status}` });
    }

    const body: any = await resp.json();
    const { key, auth_url } = body.data || {};

    if (!key) {
      return res.status(502).json({ success: false, error: '响应缺少 key' });
    }

    pendingAuthEntry.realKey = key;

    const authId = uuidv4();
    const storedAuthUrl = auth_url || '';
    const storedPlatformUrl = resolvedPlatformUrl;
    dbService.run(
      `INSERT INTO provider_auth (id, provider_name, key, auth_url, active) VALUES (?, ?, ?, ?, 0)`,
      [authId, OFFICIAL_PROVIDER_NAME, key, storedAuthUrl]
    );

    res.json({
      success: true,
      data: { key, auth_url },
    });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message || String(e) });
  }
});

/**
 * POST /api/songbing/auth/verify
 */
songbingRouter.post('/auth/verify', async (req: Request, res: Response) => {
  try {
    const { key } = req.body;

    if (!key) {
      return res.status(400).json({ success: false, error: 'key 必填' });
    }

    const provider = dbService.get<any>(
      'SELECT base_url FROM providers WHERE api_key = ?',
      [key]
    );
    
    let platformUrl = getPlatformUrl();
    let resolvedApiBaseUrl = '';
    
    let pendingAuth = pendingAuthMap.get(key);
    if (!pendingAuth) {
      for (const auth of pendingAuthMap.values()) {
        if (auth.realKey === key) {
          pendingAuth = auth;
          break;
        }
      }
    }
    
    if (pendingAuth) {
      platformUrl = pendingAuth.platformUrl;
      resolvedApiBaseUrl = pendingAuth.apiBaseUrl;
    } else if (provider?.base_url) {
      platformUrl = provider.base_url.replace(/\/api\/v1$/, '');
      resolvedApiBaseUrl = provider.base_url;
    }

    const resp = await fetch(`${platformUrl}/api/appkey/verify_appkey`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key }),
    });

    if (!resp.ok) {
      return res.status(502).json({ success: false, error: `verify_appkey 失败: ${resp.status}` });
    }

    const body: any = await resp.json();
    const active = body?.data?.active === true;

    if (active) {
      dbService.run(
        `UPDATE provider_auth SET active = 1, updated_at = CURRENT_TIMESTAMP WHERE key = ? AND provider_name IN (?, ?)`,
        [key, '松饼AI', OFFICIAL_PROVIDER_NAME]
      );

      const existing = dbService.get<any>(
        'SELECT id FROM providers WHERE name IN (?, ?)',
        ['松饼AI', OFFICIAL_PROVIDER_NAME]
      );

      if (!existing) {
        configService.addProvider({
          id: OFFICIAL_PROVIDER_ID,
          name: OFFICIAL_PROVIDER_NAME,
          apiKey: key,
          baseUrl: resolvedApiBaseUrl || getApiBaseUrl(platformUrl),
          enabled: true,
          isDefault: false,
        });
      } else {
        configService.updateProvider(OFFICIAL_PROVIDER_ID, {
          apiKey: key,
          baseUrl: resolvedApiBaseUrl || provider?.base_url,
          enabled: true,
        });
      }

      const syncResult = await syncModelsFromSongbing();

      pendingAuthMap.delete(key);

      res.json({
        success: true,
        data: {
          active: true,
          providerId: OFFICIAL_PROVIDER_ID,
          syncedModels: syncResult.count,
        },
      });
    } else {
      res.json({
        success: true,
        data: { active: false },
      });
    }
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message || String(e) });
  }
});

/**
 * POST /api/songbing/sync-models
 */
songbingRouter.post('/sync-models', async (_req: Request, res: Response) => {
  try {
    const provider = dbService.get<any>(
      'SELECT id FROM providers WHERE name = ?',
      [OFFICIAL_PROVIDER_NAME]
    );

    if (!provider) {
      return res.status(400).json({ success: false, error: '请先完成认证' });
    }

    const result = await syncModelsFromSongbing();

    res.json({
      success: true,
      data: { count: result.count, models: result.models },
    });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message || String(e) });
  }
});

/**
 * POST /api/songbing/auth/cancel
 */
songbingRouter.post('/auth/cancel', async (_req: Request, res: Response) => {
  try {
    dbService.transaction(() => {
      dbService.run(
        `DELETE FROM models WHERE provider_id = ? OR provider_id IN (SELECT id FROM providers WHERE name IN (?, ?))`,
        [OFFICIAL_PROVIDER_ID, '松饼AI', OFFICIAL_PROVIDER_NAME]
      );
      dbService.run(
        `DELETE FROM providers WHERE name IN (?, ?)`,
        ['松饼AI', OFFICIAL_PROVIDER_NAME]
      );
      dbService.run(
        `DELETE FROM provider_auth WHERE provider_name IN (?, ?)`,
        ['松饼AI', OFFICIAL_PROVIDER_NAME]
      );
    });

    res.json({
      success: true,
      data: { message: '已取消认证' },
    });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message || String(e) });
  }
});

/**
 * 从松饼平台拉取模型列表并写入 models 表
 */
async function syncModelsFromSongbing(): Promise<{ count: number; models: string[] }> {
  const provider = dbService.get<any>(
    'SELECT base_url FROM providers WHERE name = ?',
    [OFFICIAL_PROVIDER_NAME]
  );
  
  let platformUrl = getPlatformUrl();
  if (provider?.base_url) {
    platformUrl = provider.base_url.replace(/\/api\/v1$/, '');
  }

  dbService.run(
    `DELETE FROM models WHERE provider_id = ?`,
    [OFFICIAL_PROVIDER_ID]
  );

  const resp = await fetch(`${platformUrl}/api/common/scene_models?scene_code=txcode`);
  if (!resp.ok) {
    throw new Error(`scene_models 请求失败: ${resp.status}`);
  }

  const result: any = await resp.json();
  const scenes = result.data || [];

  const modelCodes: string[] = [];
  const modelNames: Record<string, string> = {};
  for (const scene of scenes) {
    const models = scene.models || [];
    for (const m of models) {
      if (m.model_code && !modelCodes.includes(m.model_code)) {
        modelCodes.push(m.model_code);
        modelNames[m.model_code] = m.model_name || m.model_code;
      }
    }
  }

  const syncedModels: string[] = [];
  for (const modelCode of modelCodes) {
    const existing = dbService.get<any>(
      'SELECT id FROM models WHERE provider_id = ? AND id = ?',
      [OFFICIAL_PROVIDER_ID, `songbing-${modelCode}`]
    );

    if (!existing) {
      const modelId = `songbing-${modelCode}`;
      configService.addModel({
        id: modelId,
        providerId: OFFICIAL_PROVIDER_ID,
        name: modelNames[modelCode],
        contextWindow: 4096,
        maxOutputTokens: 4096,
        supportsVision: false,
        supportsTools: true,
        enabled: true,
      });
      syncedModels.push(modelNames[modelCode]);
    }
  }

  return { count: syncedModels.length, models: syncedModels };
}
