/**
 * Session 模块类型定义
 */

export interface Session {
  id: string;
  title: string;
  projectPath: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SessionState {
  currentSessionId: string | null;
  sessions: Session[];
}