import cron, { ScheduledTask } from 'node-cron';
import { v4 as uuid } from 'uuid';
import { schedulerRepository } from '../../repository/scheduler.repository.js';
import type { ScheduledTaskRow, TaskSkillRow, ScheduledTaskConfig, ScheduleType, NotifyType } from '../../entity/scheduler.entity.js';
import { configService } from '../../services/config/config.service.js';
import { OpenAIProvider } from '../../core/ai/openai.provider.js';
import { createProvider } from '../../core/ai/provider.js';
import { TaskAgent } from '../../core/ai/agents/task/task.agent.js';
import { taskLogService, TaskLog } from './task-log.service.js';
import { notifyService } from './notify.service.js';

export type { ScheduleType, ScheduledTaskConfig };

export class SchedulerService {
  private tasks: Map<string, ScheduledTask> = new Map();
  private runningTasks: Set<string> = new Set();

  init(): void {
    const taskRows = schedulerRepository.listTasks();
    for (const row of taskRows) {
      this.createTaskFromDb(row);
    }
    console.log(`[Scheduler] Initialized ${this.tasks.size} scheduled tasks`);
  }

  private createTaskFromDb(row: ScheduledTaskRow): void {
    const skillRows = schedulerRepository.getTaskSkills(row.id);
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
    const rows = schedulerRepository.listTasks();
    return rows.map(row => {
      const skillRows = schedulerRepository.getTaskSkills(row.id);
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
    const row = schedulerRepository.getTask(id);
    if (!row) return undefined;

    const skillRows = schedulerRepository.getTaskSkills(row.id);

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
    const id = schedulerRepository.createTask(config);

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

    schedulerRepository.updateTask(id, {
      name: config.name,
      scheduleType: config.scheduleType,
      model: config.model,
      content: config.content,
      notifyType: config.notifyType,
      enabled: config.enabled,
      skills: config.skills,
    });

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
    schedulerRepository.deleteTask(id);
    this.removeTask(id);
  }

  startTask(id: string): void {
    const task = this.tasks.get(id);
    if (task) {
      task.start();
      schedulerRepository.startTask(id);
    }
  }

  stopTask(id: string): void {
    const task = this.tasks.get(id);
    if (task) {
      task.stop();
      schedulerRepository.stopTask(id);
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

      const provider = createProvider({
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
