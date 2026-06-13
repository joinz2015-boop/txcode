export interface ScheduledTaskRow {
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

export interface TaskSkillRow {
  id: string;
  task_id: string;
  skill: string;
  skill_order: number;
}

export interface TaskLogRow {
  id: string;
  task_id: string;
  status: string;
  prompt: string;
  result: string;
  error: string;
  duration: number;
  executed_at: string;
}

export type ScheduleType =
  | '*/5 * * * *'
  | '*/30 * * * *'
  | '0 * * * *'
  | '0 */2 * * *'
  | '0 */12 * * *'
  | '0 0 * * *'
  | '0 0 1 * *';

export type NotifyType = 'message' | 'email';

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
