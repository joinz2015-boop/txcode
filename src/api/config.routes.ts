/**
 * Config API 路由
 * 
 * 提供配置管理相关的 API：
 * - 提供商 CRUD
 * - 模型 CRUD
 * - 配置项管理
 */

import { Router, Request, Response } from 'express';
import { configService } from '../modules/config/index.js';
import { ApiResponse, ProviderCreateRequest } from './api.types.js';

export const configRouter = Router();

// ==================== 提供商管理 ====================

/**
 * 获取所有提供商
 */
configRouter.get('/providers', (req: Request, res: Response) => {
  const providers = configService.getProviders();
  res.json({
    success: true,
    data: providers.map(p => ({
      id: p.id,
      name: p.name,
      baseUrl: p.baseUrl,
      enabled: p.enabled,
      isDefault: p.isDefault,
    })),
  });
});

/**
 * 获取单个提供商（包含 API Key）
 */
configRouter.get('/providers/:id', (req: Request, res: Response) => {
  const id = String(req.params.id);
  const provider = configService.getProvider(id);
  if (!provider) {
    return res.status(404).json({ success: false, error: 'Provider not found' });
  }
  res.json({
    success: true,
    data: {
      id: provider.id,
      name: provider.name,
      apiKey: provider.apiKey,
      baseUrl: provider.baseUrl,
      enabled: provider.enabled,
      isDefault: provider.isDefault,
    },
  });
});

/**
 * 添加提供商
 */
configRouter.post('/providers', (req: Request, res: Response) => {
  const { name, apiKey, baseUrl, enabled } = req.body as ProviderCreateRequest;
  
  const id = configService.addProvider({
    name,
    apiKey,
    baseUrl: baseUrl || 'https://api.openai.com/v1',
    enabled: enabled !== false,
    isDefault: false,
  });
  
  res.status(201).json({ success: true, data: { id } });
});

/**
 * 更新提供商
 */
configRouter.put('/providers/:id', (req: Request, res: Response) => {
  const id = String(req.params.id);
  const { name, apiKey, baseUrl, enabled, isDefault } = req.body;
  
  const updateData: Record<string, unknown> = {};
  if (name !== undefined) updateData.name = name;
  if (apiKey !== undefined) updateData.apiKey = apiKey;
  if (baseUrl !== undefined) updateData.baseUrl = baseUrl;
  if (enabled !== undefined) updateData.enabled = enabled;
  if (isDefault !== undefined) updateData.isDefault = isDefault;
  
  configService.updateProvider(id, updateData);
  res.json({ success: true, message: 'Provider updated' });
});

/**
 * 删除提供商
 */
configRouter.delete('/providers/:id', (req: Request, res: Response) => {
  const id = String(req.params.id);
  configService.deleteProvider(id);
  res.json({ success: true, message: 'Provider deleted' });
});

/**
 * 设置默认提供商
 */
configRouter.put('/providers/:id/default', (req: Request, res: Response) => {
  const id = String(req.params.id);
  configService.setDefaultProvider(id);
  res.json({ success: true, message: 'Default provider set' });
});

// ==================== 模型管理 ====================

/**
 * 获取所有模型
 */
configRouter.get('/models', (req: Request, res: Response) => {
  const providerId = req.query.providerId as string;
  let models;
  
  if (providerId) {
    models = configService.getModels(providerId);
  } else {
    models = configService.getAllModels();
  }
  
  res.json({ success: true, data: models });
});

/**
 * 添加模型
 */
configRouter.post('/models', (req: Request, res: Response) => {
  const { providerId, name, enabled, contextWindow, maxOutputTokens, supportsVision, supportsTools } = req.body;
  
  const id = configService.addModel({
    providerId,
    name,
    contextWindow: contextWindow || 4096,
    maxOutputTokens: maxOutputTokens || 4096,
    supportsVision: supportsVision || false,
    supportsTools: supportsTools !== false,
    enabled: enabled !== false,
  });
  
  res.status(201).json({ success: true, data: { id } });
});

/**
 * 更新模型
 */
configRouter.put('/models/:id', (req: Request, res: Response) => {
  const id = String(req.params.id);
  const { name, enabled } = req.body;
  
  const updateData: Record<string, unknown> = {};
  if (name !== undefined) updateData.name = name;
  if (enabled !== undefined) updateData.enabled = enabled;
  
  configService.updateModel(id, updateData);
  res.json({ success: true, message: 'Model updated' });
});

/**
 * 删除模型
 */
configRouter.delete('/models/:id', (req: Request, res: Response) => {
  const id = String(req.params.id);
  configService.deleteModel(id);
  res.json({ success: true, message: 'Model deleted' });
});

// ==================== 配置项管理 ====================

/**
 * 获取配置项
 */
configRouter.get('/:key', (req: Request, res: Response) => {
  const key = String(req.params.key);
  const value = configService.get(key);
  res.json({ success: true, data: { key, value } });
});

/**
 * 设置配置项
 */
configRouter.put('/:key', (req: Request, res: Response) => {
  const key = String(req.params.key);
  const { value } = req.body;
  configService.set(key, value);
  res.json({ success: true, message: 'Config updated' });
});
