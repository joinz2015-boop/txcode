import { BaseRepository } from './base.repository.js';

export class AiLogRepository extends BaseRepository {

  async save(log: {
    sessionId: string;
    modelName: string;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    latency: number;
    success: boolean;
    error?: string;
  }): Promise<void> {
    const sql = `
      INSERT INTO ai_logs 
        (session_id, model_name, input_tokens, output_tokens, total_tokens, latency, success, error, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `;
    await this.execute(sql, [
      log.sessionId,
      log.modelName,
      log.inputTokens,
      log.outputTokens,
      log.totalTokens,
      log.latency,
      log.success ? 1 : 0,
      log.error || null
    ]);
  }

  async getBySessionId(sessionId: string): Promise<any[]> {
    const sql = `SELECT * FROM ai_logs WHERE session_id = ? ORDER BY created_at DESC`;
    return this.query(sql, [sessionId]);
  }

  async getStats(sessionId: string): Promise<any | null> {
    const sql = `
      SELECT 
        COUNT(*) as total_calls,
        SUM(input_tokens) as total_input,
        SUM(output_tokens) as total_output,
        SUM(total_tokens) as total_tokens,
        AVG(latency) as avg_latency
      FROM ai_logs
      WHERE session_id = ?
    `;
    return this.queryOne(sql, [sessionId]);
  }
}

export const aiLogRepository = new AiLogRepository();
