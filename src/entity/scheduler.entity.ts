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
