import { dbService as globalDbService, DbService } from '../core/db/db.service.js';

export class BaseRepository {
  protected db: DbService;

  constructor(db?: DbService) {
    this.db = db || globalDbService;
  }

  protected execute(sql: string, params: unknown[] = []): any {
    return this.db.run(sql, params);
  }

  protected query<T>(sql: string, params: unknown[] = []): T[] {
    return this.db.all<T>(sql, params);
  }

  protected queryOne<T>(sql: string, params: unknown[] = []): T | null {
    const results = this.query<T>(sql, params);
    return results[0] || null;
  }
}