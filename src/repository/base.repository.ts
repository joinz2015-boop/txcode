import { dbService } from '../core/db/db.service.js';

export class BaseRepository {

  protected execute(sql: string, params: unknown[] = []): void {
    dbService.run(sql, params);
  }

  protected query<T>(sql: string, params: unknown[] = []): T[] {
    return dbService.all<T>(sql, params);
  }

  protected queryOne<T>(sql: string, params: unknown[] = []): T | null {
    const results = this.query<T>(sql, params);
    return results[0] || null;
  }
}