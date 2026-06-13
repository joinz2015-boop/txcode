import { schedulerRepository } from '../../repository/scheduler.repository.js';
import type { TaskLogRow } from '../../entity/scheduler.entity.js';

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
    schedulerRepository.createLog(log);
  }

  getLogsByTaskId(taskId: string, limit = 50): TaskLog[] {
    const rows = schedulerRepository.getLogsByTaskId(taskId, limit);
    return rows.map(this.rowToLog);
  }

  getAllLogs(limit = 100): TaskLog[] {
    const rows = schedulerRepository.getAllLogs(limit);
    return rows.map(this.rowToLog);
  }

  deleteLog(id: string): void {
    schedulerRepository.deleteLog(id);
  }

  deleteLogsByTaskId(taskId: string): void {
    schedulerRepository.deleteLogsByTaskId(taskId);
  }

  private rowToLog(row: TaskLogRow): TaskLog {
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
