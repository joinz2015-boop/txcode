import * as fs from 'fs';
import * as path from 'path';
import { projectService } from '../project/project.service.js';
import { sessionService } from '../session/index.js';

interface PlanCodeMeta {
  codeSessionId: string;
  designSessionId: string;
  discussSessions: Array<{
    id: string;
    sessionId: string;
    title: string;
    createdAt: string;
  }>;
  planFilePath: string;
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

  create(folderName: string): PlanCodeSession {
    const basePath = this.getBasePath();
    this.ensureDir(basePath);
    const folderPath = path.join(basePath, folderName);
    if (fs.existsSync(folderPath)) {
      throw new Error(`会话文件夹已存在: ${folderName}`);
    }
    fs.mkdirSync(folderPath, { recursive: true });
    const now = new Date().toISOString();
    const planFilePath = this.normalizePath(
      path.join('.txcode', 'plan-code', folderName, `${folderName}_方案.md`)
    );
    const meta: PlanCodeMeta = {
      codeSessionId: '',
      designSessionId: '',
      discussSessions: [],
      planFilePath,
      createdAt: now,
      updatedAt: now,
    };
    const metaPath = path.join(folderPath, 'meta.json');
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf-8');
    return { folderName, meta, updatedAt: now };
  }

  update(oldName: string, newName: string): PlanCodeSession {
    const basePath = this.getBasePath();
    const oldPath = path.join(basePath, oldName);
    const newPath = path.join(basePath, newName);
    if (!fs.existsSync(oldPath)) {
      throw new Error(`会话文件夹不存在: ${oldName}`);
    }
    if (fs.existsSync(newPath)) {
      throw new Error(`目标文件夹已存在: ${newName}`);
    }
    fs.renameSync(oldPath, newPath);
    // update meta.json planFilePath
    const metaPath = path.join(newPath, 'meta.json');
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
    meta.planFilePath = this.normalizePath(
      path.join('.txcode', 'plan-code', newName, `${newName}_方案.md`)
    );
    meta.updatedAt = new Date().toISOString();
    // also rename plan file if it exists using old name
    const oldPlanFile = path.join(newPath, `${oldName}_方案.md`);
    const newPlanFile = path.join(newPath, `${newName}_方案.md`);
    if (fs.existsSync(oldPlanFile)) {
      fs.renameSync(oldPlanFile, newPlanFile);
    }
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf-8');
    return { folderName: newName, meta, updatedAt: meta.updatedAt };
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
