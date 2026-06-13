/**
 * Session 模块类型定义
 */

import type { Session, SessionStatus } from '../../entity/session.entity.js';

export type { Session, SessionStatus };

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