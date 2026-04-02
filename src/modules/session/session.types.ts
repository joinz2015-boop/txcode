/**
 * Session 模块类型定义
 */

export type SessionStatus = 'idle' | 'processing' | 'completed';

export interface Session {
  id: string;
  title: string;
  projectPath: string | null;
  summaryMessageId: number | null;
  promptTokens: number;
  completionTokens: number;
  cost: number;
  createdAt: string;
  updatedAt: string;
  status?: SessionStatus;
}

export interface SessionState {
  currentSessionId: string | null;
  sessions: Session[];
}

export interface CompactionResult {
  success: boolean;
  summaryMessageId?: number;
  tokensBefore: number;
  tokensAfter: number;
  error?: string;
}

export interface SessionStats {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  threshold: number;
  percentUsed: number;
  willCompact: boolean;
}