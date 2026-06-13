export interface SessionRow {
  id: string;
  title: string;
  project_path: string | null;
  summary_message_id: number | null;
  prompt_tokens: number;
  completion_tokens: number;
  cost: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export type SessionStatus = 'idle' | 'processing' | 'completed';

export interface Session {
  id: string;
  title: string;
  projectPath: string | null;
  summaryMessageId: number | null;
  promptTokens: number;
  completionTokens: number;
  cost: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}
