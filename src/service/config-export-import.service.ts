import { dbService } from '../modules/db/index.js';

export interface ExportData {
  providers?: any[];
  models?: any[];
  gateway?: any;
  wafGateway?: any;
  email?: any;
}

export class ConfigExportImportService {
  exportAll(): ExportData {
    const data: ExportData = {};

    const providers = dbService.all<any>('SELECT * FROM providers');
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

    const models = dbService.all<any>('SELECT * FROM models');
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

    const dingding = dbService.get<any>('SELECT * FROM dingding_config WHERE id = 1');
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

    const email = dbService.get<any>('SELECT * FROM email_config WHERE is_default = 1');
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

    return data;
  }

  importData(data: ExportData): { success: boolean; message: string } {
    try {
      if (data.providers && Array.isArray(data.providers)) {
        for (const p of data.providers) {
          const existing = dbService.get<any>('SELECT id FROM providers WHERE id = ?', [p.id]);
          if (existing) {
            dbService.run(
              `UPDATE providers SET name = ?, api_key = ?, base_url = ?, enabled = ?, is_default = ? WHERE id = ?`,
              [p.name, p.apiKey, p.baseUrl, p.enabled ? 1 : 0, p.isDefault ? 1 : 0, p.id]
            );
          } else {
            dbService.run(
              `INSERT INTO providers (id, name, api_key, base_url, enabled, is_default) VALUES (?, ?, ?, ?, ?, ?)`,
              [p.id, p.name, p.apiKey, p.baseUrl, p.enabled ? 1 : 0, p.isDefault ? 1 : 0]
            );
          }
        }
      }

      if (data.models && Array.isArray(data.models)) {
        for (const m of data.models) {
          const existing = dbService.get<any>('SELECT id FROM models WHERE id = ?', [m.id]);
          if (existing) {
            dbService.run(
              `UPDATE models SET name = ?, enabled = ? WHERE id = ?`,
              [m.name, m.enabled ? 1 : 0, m.id]
            );
          } else {
            dbService.run(
              `INSERT INTO models (id, provider_id, name, context_window, max_output_tokens, supports_vision, supports_tools, enabled) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [m.id, m.providerId, m.name, m.contextWindow || 4096, m.maxOutputTokens || 4096, m.supportsVision ? 1 : 0, m.supportsTools !== false ? 1 : 0, m.enabled ? 1 : 0]
            );
          }
        }
      }

      if (data.gateway) {
        dbService.run(
          `INSERT OR REPLACE INTO dingding_config (id, enabled, client_id, client_secret, updated_at) VALUES (1, ?, ?, ?, datetime('now'))`,
          [data.gateway.enabled ? 1 : 0, data.gateway.clientId || '', data.gateway.clientSecret || '']
        );
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
        const existing = dbService.get<any>('SELECT id FROM email_config WHERE is_default = 1');
        if (existing) {
          dbService.run(
            `UPDATE email_config SET host = ?, port = ?, secure = ?, user = ?, password = ?, from_name = ?, updated_at = datetime('now') WHERE id = ?`,
            [data.email.host, data.email.port, data.email.secure ? 1 : 0, data.email.user, data.email.password, data.email.fromName || '', existing.id]
          );
        } else {
          dbService.run(
            `INSERT INTO email_config (name, host, port, secure, user, password, from_name, is_default) VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
            ['Default', data.email.host, data.email.port, data.email.secure ? 1 : 0, data.email.user, data.email.password, data.email.fromName || '']
          );
        }
      }

      return { success: true, message: '配置导入成功' };
    } catch (error: any) {
      return { success: false, message: '配置导入失败: ' + error.message };
    }
  }
}

export const configExportImportService = new ConfigExportImportService();