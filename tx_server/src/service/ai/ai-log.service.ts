import { aiLogRepository, AiCallLogRow } from '../../repository/ai_log.repository.js';
import type { AiCallLog } from '../../entity/index.js';

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
    rows: AiCallLogRow[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  } {
    const { rows, total } = aiLogRepository.getLogs(page, pageSize);
    return { rows, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
  }
}

export const aiLogService = new AiLogService();
