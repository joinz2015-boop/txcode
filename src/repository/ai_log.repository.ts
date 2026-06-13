import { BaseRepository } from './base.repository.js';

export interface AiCallLogRow {
  id: number;
  model_address: string;
  model_name: string;
  request_time: string;
  response_time: string | null;
  duration_ms: number;
  input_tokens: number;
  output_tokens: number;
  cost: number;
  call_type: string;
  session_id: string | null;
  created_at: string;
}

export class AiLogRepository extends BaseRepository {
  insert(log: {
    modelAddress: string;
    modelName: string;
    requestTime: string;
    responseTime: string | null;
    durationMs: number;
    inputTokens: number;
    outputTokens: number;
    cost: number;
    callType: string;
    sessionId: string | null;
  }): void {
    this.execute(
      `INSERT INTO ai_call_logs (model_address, model_name, request_time, response_time, duration_ms, input_tokens, output_tokens, cost, call_type, session_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [log.modelAddress, log.modelName, log.requestTime, log.responseTime, log.durationMs,
       log.inputTokens, log.outputTokens, log.cost, log.callType, log.sessionId]
    );
  }

  count(): number {
    const row = this.queryOne<{ cnt: number }>('SELECT COUNT(*) as cnt FROM ai_call_logs');
    return row?.cnt || 0;
  }

  cleanup(keepLogs: number): void {
    this.execute(
      `DELETE FROM ai_call_logs WHERE id NOT IN (SELECT id FROM ai_call_logs ORDER BY request_time DESC LIMIT ?)`,
      [keepLogs]
    );
  }

  getLogs(page: number, pageSize: number): { rows: AiCallLogRow[]; total: number } {
    const offset = (page - 1) * pageSize;
    const total = this.queryOne<{ cnt: number }>('SELECT COUNT(*) as cnt FROM ai_call_logs')?.cnt || 0;
    const rows = this.query<AiCallLogRow>(
      'SELECT * FROM ai_call_logs ORDER BY request_time DESC LIMIT ? OFFSET ?',
      [pageSize, offset]
    );
    return { rows, total };
  }
}

export const aiLogRepository = new AiLogRepository();
