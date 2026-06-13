import { BaseRepository } from './base.repository.js';

export interface ScheduledTaskRow {
  id: number;
  name: string;
  cron: string;
  prompt: string;
  enabled: number;
  created_at: string;
  updated_at: string;
}

export interface TaskSkillRow {
  id: number;
  task_id: number;
  skill_name: string;
}

export interface TaskLogRow {
  id: number;
  task_id: number;
  status: string;
  output: string;
  started_at: string;
  ended_at: string;
}

export class SchedulerRepository extends BaseRepository {
  listTasks(): ScheduledTaskRow[] {
    return this.query<ScheduledTaskRow>('SELECT * FROM scheduled_tasks ORDER BY created_at');
  }

  getTask(id: number): ScheduledTaskRow | undefined {
    return this.queryOne<ScheduledTaskRow>('SELECT * FROM scheduled_tasks WHERE id = ?', [id]) || undefined;
  }

  createTask(data: { name: string; cron: string; prompt: string; enabled?: boolean }): number {
    const result = this.execute(
      'INSERT INTO scheduled_tasks (name, cron, prompt, enabled) VALUES (?, ?, ?, ?)',
      [data.name, data.cron, data.prompt, data.enabled ? 1 : 0]
    );
    return result.lastInsertRowid;
  }

  updateTask(id: number, data: Partial<{ name: string; cron: string; prompt: string; enabled: boolean }>): void {
    const updates: string[] = [];
    const values: unknown[] = [];
    if (data.name !== undefined) { updates.push('name = ?'); values.push(data.name); }
    if (data.cron !== undefined) { updates.push('cron = ?'); values.push(data.cron); }
    if (data.prompt !== undefined) { updates.push('prompt = ?'); values.push(data.prompt); }
    if (data.enabled !== undefined) { updates.push('enabled = ?'); values.push(data.enabled ? 1 : 0); }
    if (updates.length > 0) {
      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id);
      this.execute(`UPDATE scheduled_tasks SET ${updates.join(', ')} WHERE id = ?`, values);
    }
  }

  deleteTask(id: number): void {
    this.execute('DELETE FROM scheduled_tasks WHERE id = ?', [id]);
    this.execute('DELETE FROM task_skills WHERE task_id = ?', [id]);
    this.execute('DELETE FROM task_logs WHERE task_id = ?', [id]);
  }

  getTaskSkills(taskId: number): TaskSkillRow[] {
    return this.query<TaskSkillRow>('SELECT * FROM task_skills WHERE task_id = ?', [taskId]);
  }

  setTaskSkills(taskId: number, skillNames: string[]): void {
    this.execute('DELETE FROM task_skills WHERE task_id = ?', [taskId]);
    for (const name of skillNames) {
      this.execute('INSERT INTO task_skills (task_id, skill_name) VALUES (?, ?)', [taskId, name]);
    }
  }

  listTaskLogs(taskId: number, limit: number = 20): TaskLogRow[] {
    return this.query<TaskLogRow>('SELECT * FROM task_logs WHERE task_id = ? ORDER BY started_at DESC LIMIT ?', [taskId, limit]);
  }

  createTaskLog(data: { taskId: number; status: string; output?: string }): number {
    const result = this.execute(
      'INSERT INTO task_logs (task_id, status, output, started_at) VALUES (?, ?, ?, datetime(\'now\'))',
      [data.taskId, data.status, data.output || '']
    );
    return result.lastInsertRowid;
  }

  updateTaskLog(id: number, data: { status: string; output?: string }): void {
    this.execute(
      'UPDATE task_logs SET status = ?, output = ?, ended_at = datetime(\'now\') WHERE id = ?',
      [data.status, data.output || '', id]
    );
  }
}

export const schedulerRepository = new SchedulerRepository();
