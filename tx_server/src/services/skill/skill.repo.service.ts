import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { execSync } from 'child_process';
import { dbService } from '../../core/db/db.service.js';
import { Skill, SkillMetadata, RepoInfo } from './skill.types.js';
import { skillsManager } from './skills.manager.js';

interface SkillRepository {
  id: string;
  name: string;
  url: string;
  type: 'default' | 'custom';
  enabled: number;
  repo_path: string | null;
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
}

export class SkillRepositoryService {
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

      const skills = this.getSkillsFromCache(repoId);
      return {
        success: true,
        message: `Synced successfully. Found ${skills.length} skills.`,
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Sync failed: ${error.message || 'Unknown error'}`,
      };
    }
  }

  private getSkillsFromCache(repoId: string): string[] {
    const repoCachePath = this.getRepoCachePath(repoId);
    const skillsPath = path.join(repoCachePath, 'txcode', 'skills');

    if (!fs.existsSync(skillsPath)) {
      return [];
    }

    try {
      const entries = fs.readdirSync(skillsPath, { withFileTypes: true });
      return entries
        .filter(entry => entry.isDirectory() && !entry.name.startsWith('.') && !entry.name.startsWith('_'))
        .map(entry => entry.name);
    } catch {
      return [];
    }
  }

  getRemoteSkills(repoId: string): (Skill & { description: string; filePath: string })[] {
    const repo = this.getRepository(repoId);
    if (!repo) {
      return [];
    }

    const repoCachePath = this.getRepoCachePath(repoId);
    const skillsPath = path.join(repoCachePath, 'txcode', 'skills');

    if (!fs.existsSync(skillsPath)) {
      return [];
    }

    try {
      const entries = fs.readdirSync(skillsPath, { withFileTypes: true });
      const skills: (Skill & { description: string; filePath: string })[] = [];

      for (const entry of entries) {
        if (entry.isDirectory() && !entry.name.startsWith('.') && !entry.name.startsWith('_')) {
          const skillFilePath = path.join(skillsPath, entry.name, 'SKILL.md');
          if (fs.existsSync(skillFilePath)) {
            const content = fs.readFileSync(skillFilePath, 'utf-8');
            const skill = this.parseSkillContent(content, skillFilePath);
            if (skill) {
              skills.push(skill);
            }
          } else {
            skills.push({
              name: entry.name,
              description: '',
              content: '',
              rawContent: '',
              filePath: path.join(skillsPath, entry.name),
            });
          }
        }
      }

      return skills;
    } catch (error) {
      console.error('Error parsing skills from cache:', error);
      return [];
    }
  }

  private parseSkillContent(content: string, filePath: string): (Skill & { description: string; filePath: string }) | null {
    const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);

    if (!frontmatterMatch) {
      const dirName = path.basename(path.dirname(filePath));
      return {
        name: dirName,
        description: content.substring(0, 200),
        content: content,
        rawContent: content,
        filePath,
      };
    }

    const frontmatterStr = frontmatterMatch[1];
    const rawContent = frontmatterMatch[2].trim();

    try {
      const metadata = yaml.load(frontmatterStr) as SkillMetadata;

      if (!metadata.name) {
        return null;
      }

      return {
        name: metadata.name,
        description: metadata.description || '',
        license: metadata.license,
        compatibility: metadata.compatibility,
        metadata: metadata.metadata,
        content: content,
        rawContent: rawContent,
        filePath,
      };
    } catch {
      return null;
    }
  }

  async downloadSkill(repoId: string, skillName: string, projectPath?: string): Promise<boolean> {
    const repo = this.getRepository(repoId);
    if (!repo) return false;

    const repoCachePath = this.getRepoCachePath(repoId);
    const sourceSkillPath = path.join(repoCachePath, 'txcode', 'skills', skillName);

    if (!fs.existsSync(sourceSkillPath)) {
      console.error('Skill not found in cache:', sourceSkillPath);
      return false;
    }

    try {
      this.copyDirectory(sourceSkillPath, path.join(projectPath || '', '.txcode', 'skills', skillName));
      return true;
    } catch (error) {
      console.error('Failed to download skill:', error);
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
    const skills = this.getRemoteSkills(repoId);
    const downloaded: string[] = [];
    const failed: string[] = [];

    for (const skill of skills) {
      const success = await this.downloadSkill(repoId, skill.name, projectPath);
      if (success) {
        downloaded.push(skill.name);
      } else {
        failed.push(skill.name);
      }
    }

    return {
      success: failed.length === 0,
      downloaded,
      failed,
    };
  }

  getAllRepositories(): SkillRepository[] {
    return dbService.all<SkillRepository>('SELECT * FROM spec_repositories ORDER BY type, name');
  }

  getRepository(id: string): SkillRepository | undefined {
    return dbService.get<SkillRepository>('SELECT * FROM spec_repositories WHERE id = ?', [id]);
  }

  createRepository(input: { name: string; url: string; type?: string; repo_path?: string }): SkillRepository {
    const id = `repo_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    dbService.run(
      'INSERT INTO spec_repositories (id, name, url, type, repo_path) VALUES (?, ?, ?, ?, ?)',
      [id, input.name, input.url, input.type || 'custom', input.repo_path || '']
    );
    return this.getRepository(id)!;
  }

  updateRepository(id: string, input: Partial<{ name: string; url: string; type: string; repo_path: string }>): boolean {
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
    const skillsPath = path.join(repoCachePath, 'txcode', 'skills');
    return fs.existsSync(skillsPath);
  }
}

export const skillRepositoryService = new SkillRepositoryService();
