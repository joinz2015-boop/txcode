import { dbService } from '../../core/db/index.js';
import { configRepository } from '../../repository/config.repository.js';
import { emailRepository } from '../../repository/email.repository.js';

export interface ExportData {
  providers?: any[];
  models?: any[];
  providerAuth?: any[];
  gateway?: any;
  wafGateway?: any;
  email?: any;
  proxy?: { enabled: boolean; type: string; host: string; port: number };
}

export class ConfigExportImportService {
  exportAll(): ExportData {
    const data: ExportData = {};

    const providers = configRepository.listProviders();
    if (providers.length > 0) {
      data.providers = providers.map(p => ({
        id: p.id,
        name: p.name,
        apiKey: p.api_key,
        baseUrl: p.base_url,
        enabled: Boolean(p.enabled),
        isDefault: Boolean(p.is_default),
      }));
    }

    const models = configRepository.allModels();
    if (models.length > 0) {
      data.models = models.map(m => ({
        id: m.id,
        providerId: m.provider_id,
        name: m.name,
        contextWindow: m.context_window,
        maxOutputTokens: m.max_output_tokens,
        supportsVision: Boolean(m.supports_vision),
        supportsTools: m.supports_tools !== 0,
        enabled: Boolean(m.enabled),
      }));
    }

    const providerAuth = dbService.all<any>('SELECT * FROM provider_auth');
    if (providerAuth.length > 0) {
      data.providerAuth = providerAuth.map(a => ({
        id: a.id,
        providerName: a.provider_name,
        key: a.key,
        authUrl: a.auth_url,
        active: Boolean(a.active),
      }));
    }

    const dingding = configRepository.getDingTalkConfig();
    if (dingding) {
      data.gateway = {
        enabled: Boolean(dingding.enabled),
        clientId: dingding.client_id || '',
        clientSecret: dingding.client_secret || '',
      };
    }

    const waf = dbService.get<any>('SELECT * FROM waf_gateway_config WHERE id = 1');
    if (waf && (waf.server_ip || waf.secret_key)) {
      data.wafGateway = {
        serverIp: waf.server_ip || '',
        secretKey: waf.secret_key || '',
      };
    }

    const email = emailRepository.findDefault();
    if (email) {
      data.email = {
        host: email.host,
        port: email.port,
        secure: Boolean(email.secure),
        user: email.user,
        password: email.password,
        fromName: email.from_name || '',
      };
    }

    const proxy = configRepository.getProxyConfig();
    if (proxy) {
      data.proxy = {
        enabled: Boolean(proxy.enabled),
        type: proxy.type || 'http',
        host: proxy.host || '',
        port: proxy.port || 1080,
      };
    }

    return data;
  }

  importData(data: ExportData): { success: boolean; message: string } {
    try {
      if (data.providers && Array.isArray(data.providers)) {
        for (const p of data.providers) {
          const existing = dbService.get<any>('SELECT id FROM providers WHERE id = ?', [p.id]);
          if (existing) {
            configRepository.updateProvider(p.id, {
              name: p.name,
              apiKey: p.apiKey,
              baseUrl: p.baseUrl,
              enabled: p.enabled,
              isDefault: p.isDefault,
            });
          } else {
            configRepository.insertProvider({
              id: p.id,
              name: p.name,
              apiKey: p.apiKey,
              baseUrl: p.baseUrl,
              enabled: p.enabled,
              isDefault: p.isDefault,
            });
          }
        }
      }

      if (data.models && Array.isArray(data.models)) {
        for (const m of data.models) {
          const existing = dbService.get<any>('SELECT id FROM models WHERE id = ?', [m.id]);
          if (existing) {
            configRepository.updateModel(m.id, {
              name: m.name,
              enabled: m.enabled,
            });
          } else {
            configRepository.insertModel({
              id: m.id,
              providerId: m.providerId,
              name: m.name,
              contextWindow: m.contextWindow,
              maxOutputTokens: m.maxOutputTokens,
              supportsVision: m.supportsVision,
              supportsTools: m.supportsTools,
              enabled: m.enabled,
            });
          }
        }
      }

      if (data.providerAuth && Array.isArray(data.providerAuth)) {
        for (const a of data.providerAuth) {
          const existing = dbService.get<any>('SELECT id FROM provider_auth WHERE id = ?', [a.id]);
          if (existing) {
            dbService.run(
              `UPDATE provider_auth SET provider_name = ?, key = ?, auth_url = ?, active = ? WHERE id = ?`,
              [a.providerName, a.key, a.authUrl || '', a.active ? 1 : 0, a.id]
            );
          } else {
            dbService.run(
              `INSERT INTO provider_auth (id, provider_name, key, auth_url, active) VALUES (?, ?, ?, ?, ?)`,
              [a.id, a.providerName, a.key, a.authUrl || '', a.active ? 1 : 0]
            );
          }
        }
      }

      if (data.gateway) {
        configRepository.updateDingTalkConfig({
          enabled: data.gateway.enabled,
          clientId: data.gateway.clientId || '',
          clientSecret: data.gateway.clientSecret || '',
        });
      }

      if (data.wafGateway) {
        const existing = dbService.get<any>('SELECT id FROM waf_gateway_config WHERE id = 1');
        if (existing) {
          dbService.run(
            `UPDATE waf_gateway_config SET server_ip = ?, secret_key = ?, updated_at = datetime('now') WHERE id = 1`,
            [data.wafGateway.serverIp || '', data.wafGateway.secretKey || '']
          );
        } else {
          dbService.run(
            `INSERT INTO waf_gateway_config (id, server_ip, secret_key) VALUES (1, ?, ?)`,
            [data.wafGateway.serverIp || '', data.wafGateway.secretKey || '']
          );
        }
      }

      if (data.email) {
        const existing = emailRepository.findDefault();
        if (existing) {
          emailRepository.update(existing.id, {
            host: data.email.host,
            port: data.email.port,
            secure: data.email.secure ? 1 : 0,
            user: data.email.user,
            password: data.email.password,
            from_name: data.email.fromName || '',
          });
        } else {
          emailRepository.create({
            name: 'Default',
            host: data.email.host,
            port: data.email.port,
            secure: data.email.secure ? 1 : 0,
            user: data.email.user,
            password: data.email.password,
            from_name: data.email.fromName || '',
            is_default: 1,
          });
        }
      }

      if (data.proxy) {
        configRepository.updateProxyConfig({
          enabled: data.proxy.enabled,
          type: data.proxy.type || 'http',
          host: data.proxy.host || '',
          port: data.proxy.port || 1080,
        });
      }

      return { success: true, message: '配置导入成功' };
    } catch (error: any) {
      return { success: false, message: '配置导入失败: ' + error.message };
    }
  }
}

export const configExportImportService = new ConfigExportImportService();
