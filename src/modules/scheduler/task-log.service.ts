import { dbService } from '../db/db.service.js';

export interface TaskLog {
  id: string;
  taskId: string;
  status: 'success' | 'failed';
  prompt: string;
  result: string;
  error: string;
  duration: number;
  executedAt: Date;
}

export class TaskLogService {
  createLog(log: TaskLog): void {
    dbService.run(
      `INSERT INTO task_logs (id, task_id, status, prompt, result, error, duration, executed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        log.id,
        log.taskId,
        log.status,
        log.prompt,
        log.result,
        log.error,
        log.duration,
        log.executedAt instanceof Date ? log.executedAt.toISOString() : log.executedAt,
      ]
    );
  }

  getLogsByTaskId(taskId: string, limit = 50): TaskLog[] {
    const rows = dbService.all<any>(
      'SELECT * FROM task_logs WHERE task_id = ? ORDER BY executed_at DESC LIMIT ?',
      [taskId, limit]
    );
    return rows.map(this.rowToLog);
  }

  getAllLogs(limit = 100): TaskLog[] {
    const rows = dbService.all<any>(
      'SELECT * FROM task_logs ORDER BY executed_at DESC LIMIT ?',
      [limit]
    );
    return rows.map(this.rowToLog);
  }

  deleteLog(id: string): void {
    dbService.run('DELETE FROM task_logs WHERE id = ?', [id]);
  }

  deleteLogsByTaskId(taskId: string): void {
    dbService.run('DELETE FROM task_logs WHERE task_id = ?', [taskId]);
  }

  private rowToLog(row: any): TaskLog {
    return {
      id: row.id,
      taskId: row.task_id,
      status: row.status as 'success' | 'failed',
      prompt: row.prompt || '',
      result: row.result || '',
      error: row.error || '',
      duration: row.duration || 0,
      executedAt: new Date(row.executed_at),
    };
  }
}

export const taskLogService = new TaskLogService();
