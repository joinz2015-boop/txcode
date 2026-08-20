import { BaseRepository } from './base.repository.js';
import { v4 as uuidv4 } from 'uuid';

export interface ProviderAuthRow {
  id: string;
  provider_name: string;
  key: string;
  auth_url: string;
  active: number;
}

export class ProviderAuthRepository extends BaseRepository {
  listAll(): ProviderAuthRow[] {
    return this.query<ProviderAuthRow>('SELECT * FROM provider_auth');
  }

  getById(id: string): ProviderAuthRow | undefined {
    return this.queryOne<ProviderAuthRow>('SELECT * FROM provider_auth WHERE id = ?', [id]) || undefined;
  }

  upsert(data: { id: string; providerName: string; key: string; authUrl: string; active: boolean }): void {
    const existing = this.getById(data.id);
    if (existing) {
      this.execute(
        `UPDATE provider_auth SET provider_name = ?, key = ?, auth_url = ?, active = ? WHERE id = ?`,
        [data.providerName, data.key, data.authUrl || '', data.active ? 1 : 0, data.id]
      );
    } else {
      this.execute(
        `INSERT INTO provider_auth (id, provider_name, key, auth_url, active) VALUES (?, ?, ?, ?, ?)`,
        [data.id, data.providerName, data.key, data.authUrl || '', data.active ? 1 : 0]
      );
    }
  }

  delete(id: string): void {
    this.execute('DELETE FROM provider_auth WHERE id = ?', [id]);
  }
}

export const providerAuthRepository = new ProviderAuthRepository();
