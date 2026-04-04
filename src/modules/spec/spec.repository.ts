import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { dbService } from '../db/db.service.js';
import { SpecRepository, SpecRepositoryInput, Spec } from './spec.types.js';
import { specManager } from './spec.manager.js';

interface RepoInfo {
  type: 'github' | 'gitee' | 'unknown';
  owner: string;
  repo: string;
}

export class SpecRepositoryService {
  private cachePath: string;

  constructor() {
    const home = process.env.HOME || process.env.USERPROFILE || '';
    this.cachePath = path.join(home, '.txcode', 'cache');
    this.ensureCacheDir();
  }

  private ensureCacheDir(): void {
    if (!fs.existsSync(this.cachePath)) {
      fs.mkdirSync(this.cachePath, { recursive: true });
    }
  }

  private getRepoCachePath(repoId: string): string {
    return path.join(this.cachePath, repoId);
  }

  private getRepoInfo(url: string): RepoInfo | null {
    const githubMatch = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (githubMatch) {
      return {
        type: 'github',
        owner: githubMatch[1],
        repo: githubMatch[2].replace(/\.git$/, ''),
      };
    }

    const giteeMatch = url.match(/gitee\.com\/([^\/]+)\/([^\/]+)/);
    if (giteeMatch) {
      return {
        type: 'gitee',
        owner: giteeMatch[1],
        repo: giteeMatch[2].replace(/\.git$/, ''),
      };
    }

    return null;
  }

  private isGitInstalled(): boolean {
    try {
      execSync('git --version', { stdio: 'pipe' });
      return true;
    } catch {
      return false;
    }
  }

  async syncRepository(repoId: string): Promise<{ success: boolean; message: string }> {
    const repo = this.getRepository(repoId);
    if (!repo) {
      return { success: false, message: 'Repository not found' };
    }

    if (!this.isGitInstalled()) {
      return { success: false, message: 'Git is not installed. Please install Git first.' };
    }

    const repoCachePath = this.getRepoCachePath(repoId);
    const repoUrl = repo.url.endsWith('.git') ? repo.url : `${repo.url}.git`;

    try {
      if (fs.existsSync(repoCachePath)) {
        execSync('git pull', { cwd: repoCachePath, stdio: 'pipe' });
      } else {
        execSync(`git clone "${repoUrl}" "${repoCachePath}"`, { stdio: 'pipe' });
      }

      this.updateLastSyncTime(repoId);

      const specs = this.getSpecsFromCache(repoId);
      return {
        success: true,
        message: `Synced successfully. Found ${specs.length} specs.`,
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Sync failed: ${error.message || 'Unknown error'}`,
      };
    }
  }

  private getSpecsFromCache(repoId: string): string[] {
    const repoCachePath = this.getRepoCachePath(repoId);
    const specsPath = path.join(repoCachePath, 'txcode', 'specs');

    if (!fs.existsSync(specsPath)) {
      return [];
    }

    try {
      const entries = fs.readdirSync(specsPath, { withFileTypes: true });
      return entries
        .filter(entry => entry.isDirectory() && !entry.name.startsWith('.') && !entry.name.startsWith('_'))
        .map(entry => entry.name);
    } catch {
      return [];
    }
  }

  async parseRepoSpecs(repoId: string): Promise<Spec[]> {
    const repo = this.getRepository(repoId);
    if (!repo) {
      return [];
    }

    const repoCachePath = this.getRepoCachePath(repoId);
    const specsPath = path.join(repoCachePath, 'txcode', 'specs');

    if (!fs.existsSync(specsPath)) {
      return [];
    }

    try {
      const entries = fs.readdirSync(specsPath, { withFileTypes: true });
      const specs: Spec[] = [];

      for (const entry of entries) {
        if (entry.isDirectory() && !entry.name.startsWith('.') && !entry.name.startsWith('_')) {
          const specFilePath = path.join(specsPath, entry.name, 'SPEC.md');
          if (fs.existsSync(specFilePath)) {
            const content = fs.readFileSync(specFilePath, 'utf-8');
            const spec = this.parseSpecContent(content, entry.name);
            if (spec) {
              specs.push(spec);
            }
          } else {
            specs.push({
              name: entry.name,
              description: '',
              read_mode: 'optional',
              content: '',
              rawContent: '',
              filePath: path.join(specsPath, entry.name),
            });
          }
        }
      }

      return specs;
    } catch (error) {
      console.error('Error parsing specs from cache:', error);
      return [];
    }
  }

  private parseSpecContent(content: string, dirName: string): Spec | null {
    const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);

    if (!frontmatterMatch) {
      return {
        name: dirName,
        description: content.substring(0, 200),
        read_mode: 'optional',
        content: content,
        rawContent: content,
        filePath: '',
      };
    }

    const frontmatterStr = frontmatterMatch[1];
    const rawContent = frontmatterMatch[2].trim();

    try {
      const metadata = JSON.parse(frontmatterStr);
      return {
        name: metadata.name || dirName,
        description: metadata.description || '',
        read_mode: metadata.read_mode === 'required' ? 'required' : 'optional',
        content: content,
        rawContent: rawContent,
        filePath: '',
      };
    } catch {
      return {
        name: dirName,
        description: frontmatterStr.substring(0, 200),
        read_mode: 'optional',
        content: content,
        rawContent: rawContent,
        filePath: '',
      };
    }
  }

  async downloadSpec(repoId: string, specName: string, projectPath?: string): Promise<boolean> {
    const repo = this.getRepository(repoId);
    if (!repo) return false;

    const repoCachePath = this.getRepoCachePath(repoId);
    const sourceSpecPath = path.join(repoCachePath, 'txcode', 'specs', specName);

    if (!fs.existsSync(sourceSpecPath)) {
      console.error('Spec not found in cache:', sourceSpecPath);
      return false;
    }

    specManager.setProjectPath(projectPath || null);

    try {
      this.copyDirectory(sourceSpecPath, path.join(projectPath || '', '.txcode', 'specs', specName));
      return true;
    } catch (error) {
      console.error('Failed to download spec:', error);
      return false;
    }
  }

  private copyDirectory(src: string, dest: string): void {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }

    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        this.copyDirectory(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  async downloadAll(repoId: string, projectPath?: string): Promise<{ success: boolean; downloaded: string[]; failed: string[] }> {
    const specs = await this.parseRepoSpecs(repoId);
    const downloaded: string[] = [];
    const failed: string[] = [];

    for (const spec of specs) {
      const success = await this.downloadSpec(repoId, spec.name, projectPath);
      if (success) {
        downloaded.push(spec.name);
      } else {
        failed.push(spec.name);
      }
    }

    return {
      success: failed.length === 0,
      downloaded,
      failed,
    };
  }

  getAllRepositories(): SpecRepository[] {
    return dbService.all<SpecRepository>('SELECT * FROM spec_repositories ORDER BY type, name');
  }

  getRepository(id: string): SpecRepository | undefined {
    return dbService.get<SpecRepository>('SELECT * FROM spec_repositories WHERE id = ?', [id]);
  }

  createRepository(input: SpecRepositoryInput): SpecRepository {
    const id = `repo_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    dbService.run(
      'INSERT INTO spec_repositories (id, name, url, type, repo_path) VALUES (?, ?, ?, ?, ?)',
      [id, input.name, input.url, input.type || 'custom', input.repo_path || '']
    );
    return this.getRepository(id)!;
  }

  updateRepository(id: string, input: Partial<SpecRepositoryInput>): boolean {
    const updates: string[] = [];
    const params: any[] = [];

    if (input.name !== undefined) {
      updates.push('name = ?');
      params.push(input.name);
    }
    if (input.url !== undefined) {
      updates.push('url = ?');
      params.push(input.url);
    }
    if (input.type !== undefined) {
      updates.push('type = ?');
      params.push(input.type);
    }
    if (input.repo_path !== undefined) {
      updates.push('repo_path = ?');
      params.push(input.repo_path);
    }

    if (updates.length === 0) return false;

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    dbService.run(
      `UPDATE spec_repositories SET ${updates.join(', ')} WHERE id = ?`,
      params
    );
    return true;
  }

  deleteRepository(id: string): boolean {
    if (id === 'default') return false;

    const repoCachePath = this.getRepoCachePath(id);
    if (fs.existsSync(repoCachePath)) {
      try {
        fs.rmSync(repoCachePath, { recursive: true });
      } catch {
        console.error('Failed to delete repo cache:', repoCachePath);
      }
    }

    dbService.run('DELETE FROM spec_repositories WHERE id = ?', [id]);
    return true;
  }

  updateLastSyncTime(id: string): void {
    dbService.run(
      'UPDATE spec_repositories SET last_sync_at = CURRENT_TIMESTAMP WHERE id = ?',
      [id]
    );
  }

  isSynced(repoId: string): boolean {
    const repo = this.getRepository(repoId);
    if (!repo) return false;

    const repoCachePath = this.getRepoCachePath(repoId);
    const specsPath = path.join(repoCachePath, 'txcode', 'specs');
    return fs.existsSync(specsPath);
  }

  getRepoCachePathById(repoId: string): string | null {
    const repo = this.getRepository(repoId);
    if (!repo) return null;

    const repoCachePath = this.getRepoCachePath(repoId);
    const specsPath = path.join(repoCachePath, 'txcode', 'specs');

    return fs.existsSync(specsPath) ? specsPath : null;
  }
}

export const specRepositoryService = new SpecRepositoryService();
