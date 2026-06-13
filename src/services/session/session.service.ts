import { v4 as uuidv4 } from 'uuid';
import { sessionRepository, SessionRow } from '../../repository/session.repository.js';
import { memoryService } from '../../services/memory/index.js';
import { Session, SessionState, CompactionResult, SessionStats } from './session.types.js';
import { Message } from '../../services/memory/memory.types.js';

export class SessionService {
  private state: SessionState = {
    currentSessionId: null,
    sessions: [],
  };

  create(title: string, projectPath?: string): Session {
    return this.createWithId(uuidv4(), title, projectPath);
  }

  createWithId(id: string, title: string, projectPath?: string): Session {
    sessionRepository.insert({ id, title, projectPath });
    const session = this.get(id)!;
    this.state.sessions.unshift(session);
    return session;
  }

  get(id: string): Session | undefined {
    const row = sessionRepository.getById(id);
    return row ? this.rowToSession(row) : undefined;
  }

  getAll(): Session[] {
    const rows = sessionRepository.getAll();
    this.state.sessions = rows.map(this.rowToSession);
    return this.state.sessions;
  }

  update(id: string, data: Partial<Pick<Session, 'title' | 'projectPath' | 'status'>>): void {
    const repoData: Partial<{ title: string; project_path: string; status: string }> = {};
    if (data.title !== undefined) repoData.title = data.title;
    if (data.projectPath !== undefined) repoData.project_path = data.projectPath ?? undefined;
    if (data.status !== undefined) repoData.status = data.status as string;
    sessionRepository.update(id, repoData);
    const index = this.state.sessions.findIndex(s => s.id === id);
    if (index !== -1) {
      this.state.sessions[index] = this.get(id)!;
    }
  }

  delete(id: string): void {
    sessionRepository.delete(id);
    if (this.state.currentSessionId === id) {
      this.state.currentSessionId = null;
    }
    this.state.sessions = this.state.sessions.filter(s => s.id !== id);
  }

  touch(id: string): void {
    sessionRepository.touch(id);
  }

  switchTo(id: string): Session | undefined {
    const session = this.get(id);
    if (!session) return undefined;
    this.state.currentSessionId = id;
    this.touch(id);
    return session;
  }

  getCurrent(): Session | undefined {
    if (!this.state.currentSessionId) return undefined;
    return this.get(this.state.currentSessionId);
  }

  getCurrentId(): string | null {
    return this.state.currentSessionId;
  }

  getRecent(limit: number = 10): Session[] {
    return sessionRepository.getRecent(limit).map(this.rowToSession);
  }

  search(query: string): Session[] {
    return sessionRepository.search(query).map(this.rowToSession);
  }

  clearCurrent(): void {
    this.state.currentSessionId = null;
  }

  getByProjectPath(projectPath: string, limit: number = 20, offset: number = 0): Session[] {
    return sessionRepository.getByProjectPath(projectPath, limit, offset).map(this.rowToSession);
  }

  getOrCreateByPath(projectPath: string, title?: string): Session {
    const existing = sessionRepository.getFirstByProjectPath(projectPath);
    if (existing) return this.rowToSession(existing);
    return this.create(title || `Session for ${projectPath}`, projectPath);
  }

  updateTokenUsage(sessionId: string, promptTokens: number, completionTokens: number, cost: number = 0): void {
    sessionRepository.updateTokenUsage(sessionId, promptTokens, completionTokens, cost);
  }

  updateSummary(sessionId: string, summaryMessageId: number): void {
    sessionRepository.updateSummary(sessionId, summaryMessageId);
  }

  resetTokens(sessionId: string): void {
    sessionRepository.resetTokens(sessionId);
  }

  setProcessing(sessionId: string): void {
    this.update(sessionId, { status: 'processing' });
  }

  setCompleted(sessionId: string): void {
    this.update(sessionId, { status: 'completed' });
  }

  setIdle(sessionId: string): void {
    this.update(sessionId, { status: 'idle' });
  }

  cleanStaleSessions(): void {
    const stale = sessionRepository.getStaleProcessing();
    if (stale.length > 0) {
      console.log(`[Session] 清理 ${stale.length} 个残留 processing 会话`);
      sessionRepository.resetAllProcessing();
    }
  }

  getStats(sessionId: string, threshold: number): SessionStats {
    const session = this.get(sessionId);
    if (!session) {
      return { promptTokens: 0, completionTokens: 0, totalTokens: 0, threshold, percentUsed: 0, willCompact: false };
    }
    const totalTokens = session.promptTokens + session.completionTokens;
    const percentUsed = threshold > 0 ? Math.round((totalTokens / threshold) * 100) : 0;
    return { promptTokens: session.promptTokens, completionTokens: session.completionTokens, totalTokens, threshold, percentUsed, willCompact: totalTokens >= threshold };
  }

  private rowToSession(row: SessionRow): Session {
    return {
      id: row.id, title: row.title, projectPath: row.project_path,
      summaryMessageId: row.summary_message_id ?? null,
      promptTokens: row.prompt_tokens || 0, completionTokens: row.completion_tokens || 0,
      cost: row.cost || 0, createdAt: row.created_at, updatedAt: row.updated_at,
      status: (row.status || 'idle') as Session['status'],
    };
  }
}

export const sessionService = new SessionService();
