import crypto from 'crypto';
import { pluginWebshellHostRepository, PluginWebshellHostRow } from '../../repository/pluginWebshellHostRepository.js';
import { Client } from 'ssh2';

function getSecret(): string {
  return process.env.PLUGIN_WEBSHELL_HOST_SECRET || 'txcode-default-secret-key-32b';
}

function encryptPassword(password: string): string {
  const key = Buffer.from(getSecret().slice(0, 32).padEnd(32, '0'));
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(password, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decryptPassword(encrypted: string): string {
  const parts = encrypted.split(':');
  if (parts.length !== 2) return '';
  const key = Buffer.from(getSecret().slice(0, 32).padEnd(32, '0'));
  const iv = Buffer.from(parts[0], 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(parts[1], 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

function sanitize(row: PluginWebshellHostRow): Omit<PluginWebshellHostRow, 'password'> & { password: string } {
  return {
    ...row,
    password: '******',
  };
}

export class PluginWebshellHostService {
  getList() {
    const rows = pluginWebshellHostRepository.findAll();
    return rows.map(sanitize);
  }

  getDetail(id: string) {
    const row = pluginWebshellHostRepository.findById(id);
    if (!row) return null;
    return sanitize(row);
  }

  create(data: { name: string; host: string; port?: number; username: string; password: string }) {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const encrypted = encryptPassword(data.password);
    return pluginWebshellHostRepository.insert({
      id,
      name: data.name,
      host: data.host,
      port: data.port || 22,
      username: data.username,
      password: encrypted,
      createdAt: now,
      updatedAt: now,
    });
  }

  update(id: string, data: { name?: string; host?: string; port?: number; username?: string; password?: string }) {
    const existing = pluginWebshellHostRepository.findById(id);
    if (!existing) throw new Error('主机不存在');
    const now = new Date().toISOString();
    const updateData: any = { ...data, updatedAt: now };
    if (data.password) {
      updateData.password = encryptPassword(data.password);
    }
    pluginWebshellHostRepository.update(id, updateData);
  }

  delete(id: string) {
    const existing = pluginWebshellHostRepository.findById(id);
    if (!existing) throw new Error('主机不存在');
    pluginWebshellHostRepository.delete(id);
  }

  async testConnection(id: string): Promise<{ success: boolean; error?: string }> {
    const row = pluginWebshellHostRepository.findById(id);
    if (!row) return { success: false, error: '主机不存在' };

    const password = decryptPassword(row.password);
    return new Promise((resolve) => {
      const conn = new Client();
      const timer = setTimeout(() => {
        conn.end();
        resolve({ success: false, error: '连接超时' });
      }, 10000);

      conn.on('ready', () => {
        clearTimeout(timer);
        conn.end();
        resolve({ success: true });
      });

      conn.on('error', (err: Error) => {
        clearTimeout(timer);
        resolve({ success: false, error: err.message });
      });

      conn.connect({
        host: row.host,
        port: row.port,
        username: row.username,
        password,
        readyTimeout: 8000,
      });
    });
  }

  getDecryptedPassword(id: string): string | null {
    const row = pluginWebshellHostRepository.findById(id);
    if (!row) return null;
    return decryptPassword(row.password);
  }

  getById(id: string): PluginWebshellHostRow | undefined {
    return pluginWebshellHostRepository.findById(id);
  }
}

export const pluginWebshellHostService = new PluginWebshellHostService();
