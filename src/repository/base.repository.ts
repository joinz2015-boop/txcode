import { dbService } from '../modules/db/db.service.js';

export class BaseRepository {

  protected async execute(sql: string, params: unknown[] = []): Promise<void> {
    dbService.run(sql, params);
  }

  protected async query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    return dbService.all<T>(sql, params);
  }

  protected async queryOne<T>(sql: string, params: unknown[] = []): Promise<T | null> {
    const results = await this.query<T>(sql, params);
    return results[0] || null;
  }
}
