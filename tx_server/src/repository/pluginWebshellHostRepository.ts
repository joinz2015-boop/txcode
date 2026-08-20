import { dbService } from '../core/db/db.service.js';

export interface PluginWebshellHostRow {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  password: string;
  created_at: string;
  updated_at: string;
}

export class PluginWebshellHostRepository {
  findAll(): PluginWebshellHostRow[] {
    return dbService.all<PluginWebshellHostRow>('SELECT * FROM plugin_webshell_hosts ORDER BY created_at DESC');
  }

  findById(id: string): PluginWebshellHostRow | undefined {
    return dbService.get<PluginWebshellHostRow>('SELECT * FROM plugin_webshell_hosts WHERE id = ?', [id]);
  }

  insert(data: { id: string; name: string; host: string; port: number; username: string; password: string; createdAt: string; updatedAt: string }): PluginWebshellHostRow | undefined {
    dbService.run(
      'INSERT INTO plugin_webshell_hosts (id, name, host, port, username, password, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [data.id, data.name, data.host, data.port, data.username, data.password, data.createdAt, data.updatedAt]
    );
    return this.findById(data.id);
  }

  update(id: string, data: { name?: string; host?: string; port?: number; username?: string; password?: string; updatedAt: string }): void {
    const sets: string[] = [];
    const values: any[] = [];
    if (data.name !== undefined) { sets.push('name = ?'); values.push(data.name); }
    if (data.host !== undefined) { sets.push('host = ?'); values.push(data.host); }
    if (data.port !== undefined) { sets.push('port = ?'); values.push(data.port); }
    if (data.username !== undefined) { sets.push('username = ?'); values.push(data.username); }
    if (data.password !== undefined) { sets.push('password = ?'); values.push(data.password); }
    sets.push('updated_at = ?');
    values.push(data.updatedAt);
    values.push(id);
    if (sets.length > 1) {
      dbService.run(`UPDATE plugin_webshell_hosts SET ${sets.join(', ')} WHERE id = ?`, values);
    }
  }

  delete(id: string): void {
    dbService.run('DELETE FROM plugin_webshell_hosts WHERE id = ?', [id]);
  }
}

export const pluginWebshellHostRepository = new PluginWebshellHostRepository();
