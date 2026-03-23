/**
 * Skill Manager
 * 按照 skill-guide.md 规范实现
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { Skill, SkillMetadata, SkillPermission, AvailableSkill } from './skill.types.js';

export class SkillsManager {
  private skills: Map<string, Skill> = new Map();
  private searchPaths: string[] = [];
  private permissions: SkillPermission[] = [];
  private gitRoot: string | null = null;

  constructor(cwd?: string) {
    this.initSearchPaths(cwd || process.cwd());
  }

  private initSearchPaths(cwd: string): void {
    const home = process.env.HOME || process.env.USERPROFILE || '';
    this.gitRoot = this.findGitRoot(cwd);

    const basePath = this.gitRoot || cwd;

    this.searchPaths = [
      path.join(basePath, '.txcode', 'skills'),
      path.join(basePath, '.claude', 'skills'),
      path.join(basePath, '.agents', 'skills'),
      path.join(home, '.txcode', 'skills'),
      path.join(home, '.claude', 'skills'),
      path.join(home, '.agents', 'skills'),
    ];
  }

  private findGitRoot(startPath: string): string | null {
    let currentPath = startPath;

    while (currentPath !== path.dirname(currentPath)) {
      const gitPath = path.join(currentPath, '.git');
      if (fs.existsSync(gitPath)) {
        return currentPath;
      }
      currentPath = path.dirname(currentPath);
    }

    return null;
  }

  setPermissions(permissions: Record<string, 'allow' | 'deny' | 'ask'>): void {
    this.permissions = Object.entries(permissions).map(([pattern, action]) => ({
      pattern,
      action,
    }));
  }

  async loadAll(): Promise<void> {
    this.skills.clear();

    for (const searchPath of this.searchPaths) {
      await this.loadDir(searchPath);
    }
  }

  private async loadDir(dir: string): Promise<void> {
    if (!fs.existsSync(dir)) return;

    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const skillPath = path.join(dir, entry.name, 'SKILL.md');
          if (fs.existsSync(skillPath)) {
            await this.loadSkill(skillPath);
          }
        }
      }
    } catch {
      // 忽略无权访问的目录
    }
  }

  async loadSkill(filePath: string): Promise<Skill | null> {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const skill = this.parseSkill(content, filePath);

      if (skill) {
        if (!this.validateName(skill.name)) {
          console.warn(`Invalid skill name: ${skill.name} in ${filePath}`);
          return null;
        }

        const dirName = path.basename(path.dirname(filePath));
        if (skill.name !== dirName) {
          console.warn(`Skill name "${skill.name}" does not match directory name "${dirName}"`);
          return null;
        }

        const permission = this.checkPermission(skill.name);
        if (permission === 'deny') {
          return null;
        }

        this.skills.set(skill.name, skill);
      }
      return skill;
    } catch (e) {
      console.warn(`Failed to load skill from ${filePath}:`, e);
      return null;
    }
  }

  private parseSkill(content: string, filePath: string): Skill | null {
    const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);

    if (!frontmatterMatch) {
      const dirName = path.basename(path.dirname(filePath));
      return {
        name: dirName,
        description: content.substring(0, 1024),
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
        console.warn(`Skill missing name in ${filePath}`);
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
    } catch (e) {
      console.warn(`Failed to parse frontmatter in ${filePath}:`, e);
      return null;
    }
  }

  private validateName(name: string): boolean {
    if (!name || name.length > 64) return false;
    if (name.startsWith('-') || name.endsWith('-')) return false;
    if (name.includes('--')) return false;
    const regex = /^[a-z0-9]+(-[a-z0-9]+)*$/;
    return regex.test(name);
  }

  private checkPermission(name: string): 'allow' | 'deny' | 'ask' {
    for (const perm of this.permissions) {
      if (this.matchPattern(name, perm.pattern)) {
        return perm.action;
      }
    }
    return 'allow';
  }

  private matchPattern(name: string, pattern: string): boolean {
    if (pattern === '*') return true;
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return regex.test(name);
  }

  getSkill(name: string): Skill | undefined {
    return this.skills.get(name);
  }

  getAllSkills(): Skill[] {
    return Array.from(this.skills.values());
  }

  getAvailableSkills(): AvailableSkill[] {
    return this.getAllSkills()
      .filter(skill => this.checkPermission(skill.name) !== 'deny')
      .map(s => ({
        name: s.name,
        description: s.description,
      }));
  }

  has(name: string): boolean {
    return this.skills.has(name);
  }

  getSearchPaths(): string[] {
    return [...this.searchPaths];
  }

  getGitRoot(): string | null {
    return this.gitRoot;
  }
}

export const skillsManager = new SkillsManager();
