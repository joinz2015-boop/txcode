/**
 * Context 服务
 * 
 * 职责：
 * - 获取项目上下文
 * - Git 信息
 * - 文件结构
 * - 依赖分析
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { ProjectContext, FileNode, GitInfo } from './context.types.js';

export class ContextService {
  /**
   * 获取完整的项目上下文
   */
  getContext(projectPath: string = process.cwd()): ProjectContext {
    const context: ProjectContext = {
      rootPath: projectPath,
      language: this.detectLanguage(projectPath),
    };

    const gitInfo = this.getGitInfo(projectPath);
    if (gitInfo) {
      context.gitBranch = gitInfo.branch;
      context.gitStatus = gitInfo.status;
      context.gitRemote = gitInfo.remote;
    }

    const packageInfo = this.getPackageInfo(projectPath);
    if (packageInfo) {
      context.packageJson = packageInfo;
      context.dependencies = Object.keys(packageInfo.dependencies || {});
      context.devDependencies = Object.keys(packageInfo.devDependencies || {});
      context.framework = this.detectFramework(packageInfo);
    }

    context.fileStructure = this.getFileStructure(projectPath, 2);
    context.readme = this.getReadme(projectPath);

    return context;
  }

  /**
   * 获取 Git 信息
   */
  getGitInfo(projectPath: string): GitInfo | null {
    try {
      const branch = execSync('git branch --show-current', {
        cwd: projectPath,
        encoding: 'utf-8',
        timeout: 5000,
        stdio: ['pipe', 'pipe', 'pipe']
      }).trim();

      const status = execSync('git status --porcelain', {
        cwd: projectPath,
        encoding: 'utf-8',
        timeout: 5000,
        stdio: ['pipe', 'pipe', 'pipe']
      }).trim();

      const remote = execSync('git remote get-url origin 2>/dev/null || echo ""', {
        cwd: projectPath,
        encoding: 'utf-8',
        timeout: 5000,
        stdio: ['pipe', 'pipe', 'pipe']
      }).trim();

      const lastCommit = execSync('git log -1 --format="%h %s"', {
        cwd: projectPath,
        encoding: 'utf-8',
        timeout: 5000,
        stdio: ['pipe', 'pipe', 'pipe']
      }).trim();

      const author = execSync('git log -1 --format="%an"', {
        cwd: projectPath,
        encoding: 'utf-8',
        timeout: 5000,
        stdio: ['pipe', 'pipe', 'pipe']
      }).trim();

      return { branch, status, remote, lastCommit, author };
    } catch {
      return null;
    }
  }

  /**
   * 获取 package.json 信息
   */
  getPackageInfo(projectPath: string): Record<string, any> | null {
    const packageJsonPath = path.join(projectPath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      try {
        return JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      } catch {
        return null;
      }
    }
    return null;
  }

  /**
   * 获取文件结构
   */
  getFileStructure(projectPath: string, maxDepth: number = 2): FileNode[] {
    const ignoreDirs = ['node_modules', '.git', 'dist', 'build', '.next', 'coverage', '__pycache__', 'venv', '.venv'];
    const ignoreFiles = ['.DS_Store', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'];

    const walk = (dir: string, depth: number): FileNode[] => {
      if (depth > maxDepth) return [];

      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        return entries
          .filter(entry => {
            if (entry.isDirectory()) return !ignoreDirs.includes(entry.name);
            return !ignoreFiles.includes(entry.name);
          })
          .map(entry => {
            const fullPath = path.join(dir, entry.name);
            const relativePath = path.relative(projectPath, fullPath);
            
            if (entry.isDirectory()) {
              return {
                name: entry.name,
                path: relativePath,
                type: 'directory' as const,
                children: walk(fullPath, depth + 1)
              };
            }
            return {
              name: entry.name,
              path: relativePath,
              type: 'file' as const
            };
          });
      } catch {
        return [];
      }
    };

    return walk(projectPath, 0);
  }

  /**
   * 获取 README 内容
   */
  getReadme(projectPath: string): string | undefined {
    const readmePath = path.join(projectPath, 'README.md');
    if (fs.existsSync(readmePath)) {
      try {
        const content = fs.readFileSync(readmePath, 'utf-8');
        return content.slice(0, 2000);
      } catch {
        return undefined;
      }
    }
    return undefined;
  }

  /**
   * 检测项目语言
   */
  detectLanguage(projectPath: string): string {
    if (fs.existsSync(path.join(projectPath, 'package.json'))) {
      return 'typescript';
    }
    if (fs.existsSync(path.join(projectPath, 'requirements.txt')) || 
        fs.existsSync(path.join(projectPath, 'pyproject.toml'))) {
      return 'python';
    }
    if (fs.existsSync(path.join(projectPath, 'go.mod'))) {
      return 'go';
    }
    if (fs.existsSync(path.join(projectPath, 'Cargo.toml'))) {
      return 'rust';
    }
    if (fs.existsSync(path.join(projectPath, 'pom.xml'))) {
      return 'java';
    }
    return 'unknown';
  }

  /**
   * 检测框架
   */
  private detectFramework(packageJson: Record<string, any>): string | undefined {
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    if (deps['next']) return 'nextjs';
    if (deps['nuxt']) return 'nuxt';
    if (deps['react']) return 'react';
    if (deps['vue']) return 'vue';
    if (deps['express']) return 'express';
    if (deps['nest']) return 'nestjs';
    if (deps['fastify']) return 'fastify';
    return undefined;
  }

  /**
   * 获取项目摘要（用于 AI 上下文）
   */
  getProjectSummary(projectPath: string = process.cwd()): string {
    const context = this.getContext(projectPath);
    const parts: string[] = [];

    parts.push(`Project: ${path.basename(context.rootPath)}`);
    parts.push(`Language: ${context.language}`);
    
    if (context.framework) {
      parts.push(`Framework: ${context.framework}`);
    }
    
    if (context.gitBranch) {
      parts.push(`Branch: ${context.gitBranch}`);
    }

    if (context.dependencies && context.dependencies.length > 0) {
      parts.push(`Main dependencies: ${context.dependencies.slice(0, 5).join(', ')}`);
    }

    return parts.join('\n');
  }
}

export const contextService = new ContextService();