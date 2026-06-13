import { aiLogRepository, AiCallLogRow } from '../../repository/ai_log.repository.js';

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
    aiLogRepository.insert({
      modelAddress: log.model_address,
      modelName: log.model_name,
      requestTime: log.request_time?.toISOString() || new Date().toISOString(),
      responseTime: log.response_time?.toISOString() || null,
      durationMs: log.duration_ms || 0,
      inputTokens: log.input_tokens || 0,
      outputTokens: log.output_tokens || 0,
      cost: log.cost || 0,
      callType: log.call_type,
      sessionId: log.session_id || null,
    });
    await this.cleanupIfNeeded();
  }

  private cleanupIfNeeded(): void {
    const count = aiLogRepository.count();
    if (count > this.MAX_LOGS) {
      aiLogRepository.cleanup(this.KEEP_LOGS);
    }
  }

  getLogs(page: number = 1, pageSize: number = 50): {
    rows: AiLogRow[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  } {
    const { rows, total } = aiLogRepository.getLogs(page, pageSize);
    return {
      rows: rows.map(r => ({
        id: r.id, model_address: r.model_address, model_name: r.model_name,
        request_time: r.request_time, response_time: r.response_time,
        duration_ms: r.duration_ms, input_tokens: r.input_tokens, output_tokens: r.output_tokens,
        cost: r.cost, call_type: r.call_type, session_id: r.session_id, created_at: r.created_at,
      })),
      total, page, pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }
}

export const aiLogService = new AiLogService();
