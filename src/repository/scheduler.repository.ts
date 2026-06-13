import { BaseRepository } from './base.repository.js';
import { v4 as uuidv4 } from 'uuid';
import type { ScheduledTaskRow, TaskSkillRow, TaskLogRow, ScheduledTaskConfig } from '../entity/scheduler.entity.js';

export type { ScheduledTaskRow, TaskSkillRow, TaskLogRow, ScheduledTaskConfig };

export class SchedulerRepository extends BaseRepository {
  listTasks(): ScheduledTaskRow[] {
    return this.query<ScheduledTaskRow>('SELECT * FROM scheduled_tasks ORDER BY created_at DESC');
  }

  getTask(id: string): ScheduledTaskRow | undefined {
    return this.queryOne<ScheduledTaskRow>('SELECT * FROM scheduled_tasks WHERE id = ?', [id]) || undefined;
  }

  getTaskSkills(taskId: string): TaskSkillRow[] {
    return this.query<TaskSkillRow>('SELECT * FROM task_skills WHERE task_id = ? ORDER BY skill_order ASC', [taskId]);
  }

  createTask(config: ScheduledTaskConfig): string {
    const id = config.id || uuidv4();
    this.execute(
      `INSERT INTO scheduled_tasks (id, name, schedule_type, model, content, notify_type, enabled, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [id, config.name, config.scheduleType, config.model, config.content, config.notifyType, config.enabled !== false ? 1 : 0]
    );
    for (let i = 0; i < config.skills.length; i++) {
      this.execute(
        'INSERT INTO task_skills (id, task_id, skill, skill_order) VALUES (?, ?, ?, ?)',
        [uuidv4(), id, config.skills[i], i]
      );
    }
    return id;
  }

  updateTask(id: string, partial: Partial<{ name: string; scheduleType: string; model: string; content: string; notifyType: string; enabled: boolean; skills: string[] }>): void {
    const updates: string[] = [];
    const values: unknown[] = [];

    if (partial.name !== undefined) { updates.push('name = ?'); values.push(partial.name); }
    if (partial.scheduleType !== undefined) { updates.push('schedule_type = ?'); values.push(partial.scheduleType); }
    if (partial.model !== undefined) { updates.push('model = ?'); values.push(partial.model); }
    if (partial.content !== undefined) { updates.push('content = ?'); values.push(partial.content); }
    if (partial.notifyType !== undefined) { updates.push('notify_type = ?'); values.push(partial.notifyType); }
    if (partial.enabled !== undefined) { updates.push('enabled = ?'); values.push(partial.enabled ? 1 : 0); }

    if (updates.length > 0) {
      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id);
      this.execute(`UPDATE scheduled_tasks SET ${updates.join(', ')} WHERE id = ?`, values);
    }

    if (partial.skills !== undefined) {
      this.execute('DELETE FROM task_skills WHERE task_id = ?', [id]);
      for (let i = 0; i < partial.skills.length; i++) {
        this.execute(
          'INSERT INTO task_skills (id, task_id, skill, skill_order) VALUES (?, ?, ?, ?)',
          [uuidv4(), id, partial.skills[i], i]
        );
      }
    }
  }

  deleteTask(id: string): void {
    this.execute('DELETE FROM task_skills WHERE task_id = ?', [id]);
    this.execute('DELETE FROM task_logs WHERE task_id = ?', [id]);
    this.execute('DELETE FROM scheduled_tasks WHERE id = ?', [id]);
  }

  startTask(id: string): void {
    this.execute('UPDATE scheduled_tasks SET enabled = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
  }

  stopTask(id: string): void {
    this.execute('UPDATE scheduled_tasks SET enabled = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
  }

  createLog(log: { id: string; taskId: string; status: string; prompt: string; result: string; error: string; duration: number; executedAt: Date }): void {
    this.execute(
      `INSERT INTO task_logs (id, task_id, status, prompt, result, error, duration, executed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [log.id, log.taskId, log.status, log.prompt, log.result, log.error, log.duration, log.executedAt instanceof Date ? log.executedAt.toISOString() : log.executedAt]
    );
  }

  getLogsByTaskId(taskId: string, limit: number = 50): TaskLogRow[] {
    return this.query<TaskLogRow>(
      'SELECT * FROM task_logs WHERE task_id = ? ORDER BY executed_at DESC LIMIT ?',
      [taskId, limit]
    );
  }

  getAllLogs(limit: number = 100): TaskLogRow[] {
    return this.query<TaskLogRow>(
      'SELECT * FROM task_logs ORDER BY executed_at DESC LIMIT ?',
      [limit]
    );
  }

  deleteLog(id: string): void {
    this.execute('DELETE FROM task_logs WHERE id = ?', [id]);
  }

  deleteLogsByTaskId(taskId: string): void {
    this.execute('DELETE FROM task_logs WHERE task_id = ?', [taskId]);
  }
}

export const schedulerRepository = new SchedulerRepository();
