import { dbService } from '../db/db.service.js';

export interface AiCallLog {
  model_address: string;
  model_name: string;
  request_time: Date;
  response_time?: Date;
  duration_ms: number;
  input_tokens: number;
  output_tokens: number;
  cost: number;
  call_type: 'tool_call' | 'normal';
  session_id?: string;
}

interface AiLogRow {
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

class AiLogService {
  private readonly MAX_LOGS = 5000;
  private readonly KEEP_LOGS = 1000;

  async logAiCall(log: AiCallLog): Promise<void> {
    dbService.run(
      `INSERT INTO ai_call_logs 
       (model_address, model_name, request_time, response_time, duration_ms,
        input_tokens, output_tokens, cost, call_type, session_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        log.model_address,
        log.model_name,
        log.request_time?.toISOString() || new Date().toISOString(),
        log.response_time?.toISOString() || null,
        log.duration_ms || 0,
        log.input_tokens || 0,
        log.output_tokens || 0,
        log.cost || 0,
        log.call_type,
        log.session_id || null,
      ]
    );

    await this.cleanupIfNeeded();
  }

  private cleanupIfNeeded(): void {
    const count = dbService.get<{ cnt: number }>('SELECT COUNT(*) as cnt FROM ai_call_logs');
    
    if (count && count.cnt > this.MAX_LOGS) {
      dbService.run(`
        DELETE FROM ai_call_logs 
        WHERE id NOT IN (
          SELECT id FROM ai_call_logs 
          ORDER BY request_time DESC 
          LIMIT ?
        )
      `, [this.KEEP_LOGS]);
    }
  }

  getLogs(page: number = 1, pageSize: number = 50): {
    rows: AiLogRow[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  } {
    const offset = (page - 1) * pageSize;
    const total = dbService.get<{ cnt: number }>('SELECT COUNT(*) as cnt FROM ai_call_logs')?.cnt || 0;
    const rows = dbService.all<AiLogRow>(
      'SELECT * FROM ai_call_logs ORDER BY request_time DESC LIMIT ? OFFSET ?',
      [pageSize, offset]
    );

    return {
      rows,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }
}

export const aiLogService = new AiLogService();
