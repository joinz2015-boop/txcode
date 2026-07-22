import * as fs from 'fs';
import * as path from 'path';
import { projectService } from '../project/project.service.js';
import { sessionService } from '../session/index.js';

interface PlanCodeMeta {
  sessionName: string;
  codeSessionId: string;
  designSessionId: string;
  discussSessions: Array<{
    id: string;
    sessionId: string;
    title: string;
    createdAt: string;
  }>;
  testSessions: Array<{
    id: string;
    sessionId: string;
    title: string;
    testUrl: string;
    createdAt: string;
  }>;
  planFilePath: string;
  parentPlanPath?: string;
  createdAt: string;
  updatedAt: string;
}

interface PlanCodeSession {
  folderName: string;
  meta: PlanCodeMeta;
  updatedAt: string;
}

export class PlanCodeService {
  private getBasePath(): string {
    const projectPath = projectService.getCurrentProjectPath();
    return path.join(projectPath, '.txcode', 'plan-code');
  }

  private ensureDir(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  private normalizePath(p: string): string {
    return p.replace(/\\/g, '/');
  }

  list(): PlanCodeSession[] {
    const basePath = this.getBasePath();
    if (!fs.existsSync(basePath)) {
      return [];
    }
    const entries = fs.readdirSync(basePath, { withFileTypes: true });
    const sessions: PlanCodeSession[] = [];
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const metaPath = path.join(basePath, entry.name, 'meta.json');
      if (!fs.existsSync(metaPath)) continue;
      try {
        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
        const stat = fs.statSync(metaPath);
        sessions.push({
          folderName: entry.name,
          meta,
          updatedAt: stat.mtime.toISOString(),
        });
      } catch {
        // skip invalid folders
      }
    }
    sessions.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return sessions;
  }

  create(sessionName: string, parentPlanPath?: string): PlanCodeSession {
    const basePath = this.getBasePath();
    this.ensureDir(basePath);

    const now = new Date();
    let timestamp = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
      String(now.getHours()).padStart(2, '0'),
      String(now.getMinutes()).padStart(2, '0'),
      String(now.getSeconds()).padStart(2, '0'),
    ].join('');

    let folderPath = path.join(basePath, timestamp);
    let finalName = timestamp;
    let retry = 0;
    while (fs.existsSync(folderPath)) {
      retry++;
      finalName = timestamp + '_' + retry;
      folderPath = path.join(basePath, finalName);
    }

    fs.mkdirSync(folderPath, { recursive: true });
    const nowIso = now.toISOString();

    const planFilePath = this.normalizePath(
      path.join('.txcode', 'plan-code', finalName, `${finalName}_方案.md`)
    );

    const meta: PlanCodeMeta = {
      sessionName,
      codeSessionId: '',
      designSessionId: '',
      discussSessions: [],
      testSessions: [],
      planFilePath,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    if (parentPlanPath) {
      meta.parentPlanPath = parentPlanPath;
    }

    const metaPath = path.join(folderPath, 'meta.json');
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf-8');

    const planContent = parentPlanPath
      ? `# ${sessionName}_方案

> 创建时间：${nowIso}
> 父方案：[${parentPlanPath}](${parentPlanPath})

## 用户原始需求

## 业务目标

## 功能点

`
      : `# ${sessionName}_方案

> 创建时间：${nowIso}

## 用户原始需求

## 业务目标

## 功能点

`;

    const planFilePathAbs = path.join(folderPath, `${finalName}_方案.md`);
    fs.writeFileSync(planFilePathAbs, planContent, 'utf-8');

    return { folderName: finalName, meta, updatedAt: nowIso };
  }

  renameSession(folderName: string, newSessionName: string): PlanCodeSession {
    const basePath = this.getBasePath();
    const metaPath = path.join(basePath, folderName, 'meta.json');
    if (!fs.existsSync(metaPath)) {
      throw new Error(`会话文件夹不存在: ${folderName}`);
    }
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
    meta.sessionName = newSessionName;
    meta.updatedAt = new Date().toISOString();
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf-8');
    return { folderName, meta, updatedAt: meta.updatedAt };
  }

  /** @deprecated 使用 renameSession 代替，目录名已改为时间戳不可变 */
  update(oldName: string, newName: string): PlanCodeSession {
    return this.renameSession(oldName, newName);
  }

  delete(folderName: string): void {
    const basePath = this.getBasePath();
    const folderPath = path.join(basePath, folderName);
    if (!fs.existsSync(folderPath)) {
      throw new Error(`会话文件夹不存在: ${folderName}`);
    }
    // clean up associated backend sessions
    const metaPath = path.join(folderPath, 'meta.json');
    if (fs.existsSync(metaPath)) {
      try {
        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
        if (meta.codeSessionId) {
          try { sessionService.delete(meta.codeSessionId); } catch {}
        }
        if (meta.designSessionId) {
          try { sessionService.delete(meta.designSessionId); } catch {}
        }
        if (meta.discussSessions) {
          for (const disc of meta.discussSessions) {
            if (disc.sessionId) {
              try { sessionService.delete(disc.sessionId); } catch {}
            }
          }
        }
        if (meta.testSessions) {
          for (const ts of meta.testSessions) {
            if (ts.sessionId) {
              try { sessionService.delete(ts.sessionId); } catch {}
            }
          }
        }
      } catch {}
    }
    fs.rmSync(folderPath, { recursive: true, force: true });
  }

  detail(folderName: string): PlanCodeSession | null {
    const basePath = this.getBasePath();
    const metaPath = path.join(basePath, folderName, 'meta.json');
    if (!fs.existsSync(metaPath)) return null;
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
    const stat = fs.statSync(metaPath);
    return { folderName, meta, updatedAt: stat.mtime.toISOString() };
  }

  saveMeta(folderName: string, meta: PlanCodeMeta): void {
    const basePath = this.getBasePath();
    const folderPath = path.join(basePath, folderName);
    if (!fs.existsSync(folderPath)) {
      throw new Error(`会话文件夹不存在: ${folderName}`);
    }
    meta.updatedAt = new Date().toISOString();
    const metaPath = path.join(folderPath, 'meta.json');
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf-8');
  }

  savePlan(folderName: string, content: string): void {
    const basePath = this.getBasePath();
    const folderPath = path.join(basePath, folderName);
    this.ensureDir(folderPath);
    const planFilePath = path.join(folderPath, `${folderName}_方案.md`);
    fs.writeFileSync(planFilePath, content, 'utf-8');
  }

  readPlan(folderName: string): string {
    const basePath = this.getBasePath();
    const planFilePath = path.join(basePath, folderName, `${folderName}_方案.md`);
    if (!fs.existsSync(planFilePath)) return '';
    return fs.readFileSync(planFilePath, 'utf-8');
  }

  getFullPlanPath(folderName: string): string {
    const basePath = this.getBasePath();
    return path.join(basePath, folderName, `${folderName}_方案.md`);
  }
}

export const planCodeService = new PlanCodeService();
