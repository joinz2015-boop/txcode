import { BaseRepository } from './base.repository.js';
import type { LspServerRow } from '../entity/lsp.entity.js';
import { lspServerTable, insertLSPServerSQL, defaultLSPServers } from '../core/lsp/sql.js';

export type { LspServerRow };

export class LspRepository extends BaseRepository {
  initTable(): void {
    this.execute(lspServerTable, []);
    const now = Date.now();
    for (const server of defaultLSPServers) {
      this.execute(insertLSPServerSQL, [server.id, server.enabled, server.auto_start, now, now]);
    }
  }

  loadConfigs(): LspServerRow[] {
    return this.query<LspServerRow>(
      'SELECT id, enabled, auto_start FROM lsp_server'
    );
  }

  updateConfig(id: string, enabled: number, autoStart: number): void {
    const now = Date.now();
    this.execute(
      'UPDATE lsp_server SET enabled = ?, auto_start = ?, updated_at = ? WHERE id = ?',
      [enabled, autoStart, now, id]
    );
  }
}

export const lspRepository = new LspRepository();
