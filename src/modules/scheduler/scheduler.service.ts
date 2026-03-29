import cron, { ScheduledTask } from 'node-cron';
import { v4 as uuid } from 'uuid';
import { dbService } from '../db/db.service.js';
import { configService } from '../config/config.service.js';
import { OpenAIProvider } from '../ai/openai.provider.js';
import { TaskAgent } from '../ai/agents/task/task.agent.js';
import { taskLogService, TaskLog } from './task-log.service.js';
import { notifyService, NotifyType } from './notify.service.js';

export type ScheduleType =
  | '*/5 * * * *'
  | '*/30 * * * *'
  | '0 * * * *'
  | '0 */2 * * *'
  | '0 */12 * * *'
  | '0 0 * * *'
  | '0 0 1 * *';

export interface ScheduledTaskConfig {
  id?: string;
  name: string;
  scheduleType: ScheduleType;
  model: string;
  skills: string[];
  content: string;
  notifyType: NotifyType;
  enabled?: boolean;
}

interface ScheduledTaskRow {
  id: string;
  name: string;
  schedule_type: string;
  model: string;
  content: string;
  notify_type: string;
  enabled: number;
  created_at: string;
  updated_at: string;
}

interface TaskSkillRow {
  id: string;
  task_id: string;
  skill: string;
  skill_order: number;
}

export class SchedulerService {
  private tasks: Map<string, ScheduledTask> = new Map();
  private runningTasks: Set<string> = new Set();

  init(): void {
    const taskRows = dbService.all<ScheduledTaskRow>('SELECT * FROM scheduled_tasks');
    for (const row of taskRows) {
      this.createTaskFromDb(row);
    }
    console.log(`[Scheduler] Initialized ${this.tasks.size} scheduled tasks`);
  }

  private createTaskFromDb(row: ScheduledTaskRow): void {
    const skillRows = dbService.all<TaskSkillRow>(
      'SELECT * FROM task_skills WHERE task_id = ? ORDER BY skill_order ASC',
      [row.id]
    );
    const skills = skillRows.map(s => s.skill);

    const config: ScheduledTaskConfig = {
      id: row.id,
      name: row.name,
      scheduleType: row.schedule_type as ScheduleType,
      model: row.model,
      skills,
      content: row.content,
      notifyType: row.notify_type as NotifyType,
      enabled: Boolean(row.enabled),
    };

    const task = cron.schedule(config.scheduleType, async () => {
      await this.executeTask(config.id!);
    });

    this.tasks.set(config.id!, task);
    if (config.enabled) {
      task.start();
    }
  }

  getAllTasks(): ScheduledTaskConfig[] {
    const rows = dbService.all<ScheduledTaskRow>('SELECT * FROM scheduled_tasks ORDER BY created_at DESC');
    return rows.map(row => {
      const skillRows = dbService.all<TaskSkillRow>(
        'SELECT skill FROM task_skills WHERE task_id = ? ORDER BY skill_order ASC',
        [row.id]
      );
      return {
        id: row.id,
        name: row.name,
        scheduleType: row.schedule_type as ScheduleType,
        model: row.model,
        skills: skillRows.map(s => s.skill),
        content: row.content,
        notifyType: row.notify_type as NotifyType,
        enabled: Boolean(row.enabled),
      };
    });
  }

  getTask(id: string): ScheduledTaskConfig | undefined {
    const row = dbService.get<ScheduledTaskRow>('SELECT * FROM scheduled_tasks WHERE id = ?', [id]);
    if (!row) return undefined;

    const skillRows = dbService.all<TaskSkillRow>(
      'SELECT skill FROM task_skills WHERE task_id = ? ORDER BY skill_order ASC',
      [row.id]
    );

    return {
      id: row.id,
      name: row.name,
      scheduleType: row.schedule_type as ScheduleType,
      model: row.model,
      skills: skillRows.map(s => s.skill),
      content: row.content,
      notifyType: row.notify_type as NotifyType,
      enabled: Boolean(row.enabled),
    };
  }

  createTask(config: ScheduledTaskConfig): string {
    const id = config.id || uuid();

    dbService.run(
      `INSERT INTO scheduled_tasks (id, name, schedule_type, model, content, notify_type, enabled, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [id, config.name, config.scheduleType, config.model, config.content, config.notifyType, config.enabled !== false ? 1 : 0]
    );

    for (let i = 0; i < config.skills.length; i++) {
      dbService.run(
        'INSERT INTO task_skills (id, task_id, skill, skill_order) VALUES (?, ?, ?, ?)',
        [uuid(), id, config.skills[i], i]
      );
    }

    const task = cron.schedule(config.scheduleType, async () => {
      await this.executeTask(id);
    });

    this.tasks.set(id, task);
    if (config.enabled !== false) {
      task.start();
    }

    return id;
  }

  updateTask(id: string, config: Partial<ScheduledTaskConfig>): void {
    const existing = this.getTask(id);
    if (!existing) return;

    const updates: string[] = [];
    const values: unknown[] = [];

    if (config.name !== undefined) {
      updates.push('name = ?');
      values.push(config.name);
    }
    if (config.scheduleType !== undefined) {
      updates.push('schedule_type = ?');
      values.push(config.scheduleType);
    }
    if (config.model !== undefined) {
      updates.push('model = ?');
      values.push(config.model);
    }
    if (config.content !== undefined) {
      updates.push('content = ?');
      values.push(config.content);
    }
    if (config.notifyType !== undefined) {
      updates.push('notify_type = ?');
      values.push(config.notifyType);
    }
    if (config.enabled !== undefined) {
      updates.push('enabled = ?');
      values.push(config.enabled ? 1 : 0);
    }

    if (updates.length > 0) {
      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id);
      dbService.run(`UPDATE scheduled_tasks SET ${updates.join(', ')} WHERE id = ?`, values);
    }

    if (config.skills !== undefined) {
      dbService.run('DELETE FROM task_skills WHERE task_id = ?', [id]);
      for (let i = 0; i < config.skills.length; i++) {
        dbService.run(
          'INSERT INTO task_skills (id, task_id, skill, skill_order) VALUES (?, ?, ?, ?)',
          [uuid(), id, config.skills[i], i]
        );
      }
    }

    this.removeTask(id);
    const updated = this.getTask(id);
    if (updated) {
      this.createTaskFromDb({
        id: updated.id!,
        name: updated.name,
        schedule_type: updated.scheduleType,
        model: updated.model,
        content: updated.content,
        notify_type: updated.notifyType,
        enabled: updated.enabled ? 1 : 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
  }

  deleteTask(id: string): void {
    dbService.run('DELETE FROM task_skills WHERE task_id = ?', [id]);
    dbService.run('DELETE FROM task_logs WHERE task_id = ?', [id]);
    dbService.run('DELETE FROM scheduled_tasks WHERE id = ?', [id]);
    this.removeTask(id);
  }

  startTask(id: string): void {
    const task = this.tasks.get(id);
    if (task) {
      task.start();
      dbService.run('UPDATE scheduled_tasks SET enabled = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
    }
  }

  stopTask(id: string): void {
    const task = this.tasks.get(id);
    if (task) {
      task.stop();
      dbService.run('UPDATE scheduled_tasks SET enabled = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
    }
  }

  async runTaskNow(id: string): Promise<{ success: boolean; result?: string; error?: string }> {
    return await this.executeTask(id);
  }

  private async executeTask(taskId: string): Promise<{ success: boolean; result?: string; error?: string }> {
    const taskConfig = this.getTask(taskId);
    if (!taskConfig) {
      return { success: false, error: 'Task not found' };
    }

    if (this.runningTasks.has(taskId)) {
      console.warn(`[Scheduler] Task ${taskId} is already running, skipping this execution`);
      return { success: false, error: 'Task is already running' };
    }
    this.runningTasks.add(taskId);

    const logId = uuid();
    const startTime = Date.now();

    try {
      const providerConfig = configService.getProvider(configService.getModelProvider(taskConfig.model)?.id || '');
      const models = providerConfig ? configService.getModels(providerConfig.id) : [];
      const modelName = taskConfig.model || models.find(m => m.enabled)?.name || 'gpt-4';

      const provider = new OpenAIProvider({
        baseUrl: providerConfig?.baseUrl || '',
        apiKey: providerConfig?.apiKey || '',
        defaultModel: modelName,
      });

      const agent = new TaskAgent({
        provider,
        maxIterations: 50,
        projectPath: process.cwd(),
        sessionId: `scheduler-${taskId}-${Date.now()}`,
      });

      const userMessage = taskConfig.content;

      const result = await agent.run(userMessage);

      const log: TaskLog = {
        id: logId,
        taskId: taskId,
        status: result.success ? 'success' : 'failed',
        prompt: userMessage,
        result: result.answer || '',
        error: result.error || '',
        duration: Date.now() - startTime,
        executedAt: new Date(),
      };
      taskLogService.createLog(log);

      if (result.success) {
        await notifyService.send(taskConfig.notifyType, {
          taskName: taskConfig.name,
          result: result.answer || '',
        });
      }

      return {
        success: result.success,
        result: result.answer,
        error: result.error,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const log: TaskLog = {
        id: logId,
        taskId: taskId,
        status: 'failed',
        prompt: taskConfig.content,
        result: '',
        error: errorMessage,
        duration: Date.now() - startTime,
        executedAt: new Date(),
      };
      taskLogService.createLog(log);

      return { success: false, error: errorMessage };
    } finally {
      this.runningTasks.delete(taskId);
    }
  }

  removeTask(id: string): void {
    const task = this.tasks.get(id);
    if (task) {
      task.stop();
      this.tasks.delete(id);
    }
  }

  shutdown(): void {
    for (const [id, task] of this.tasks) {
      task.stop();
      console.log(`[Scheduler] Stopped task ${id}`);
    }
    this.tasks.clear();
    console.log('[Scheduler] Shutdown complete');
  }
}

export const schedulerService = new SchedulerService();
