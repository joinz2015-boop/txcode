# Context 模块设计

## 1. Context 概述

Context 模块负责获取和解析项目上下文信息，包括项目结构、依赖、配置等。

---

## 2. 功能列表

| 功能 | 说明 |
|------|------|
| 项目路径 | 获取当前项目根目录 |
| 项目结构 | 递归列出项目文件和目录 |
| Git 信息 | 获取 git 分支、状态、远程仓库 |
| 依赖信息 | 读取 package.json、requirements.txt 等 |
| 配置文件 | 读取项目配置文件 |
| 技术栈判断 | 根据文件判断前端/后端技术栈 |

---

## 3. Context 类型定义

```typescript
// modules/context/context.types.ts

export interface ProjectContext {
  rootPath: string;
  language: 'zh' | 'en';
  projectType: ProjectType;
  structure: ProjectStructure;
  git?: GitInfo;
  dependencies?: DependencyInfo;
  configs: Record<string, any>;
}

export type ProjectType = 
  | 'node'           // Node.js 项目
  | 'python'        // Python 项目
  | 'go'            // Go 项目
  | 'rust'          // Rust 项目
  | 'java'          // Java 项目
  | 'frontend'      // 前端项目 (React/Vue)
  | 'backend'       // 后端 API
  | 'unknown';

export interface ProjectStructure {
  files: FileNode[];
  totalFiles: number;
  totalLines: number;
}

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  size?: number;
  extension?: string;
}

export interface GitInfo {
  branch: string;
  status: 'clean' | 'dirty';
  remote?: string;
  rootDir: string;
}

export interface DependencyInfo {
  packageManager: 'npm' | 'pnpm' | 'yarn' | 'pip' | 'cargo';
  dependencies: string[];
  devDependencies: string[];
}
```

---

## 4. Context Service 实现

```typescript
// modules/context/context.service.ts

import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

import {
  ProjectContext,
  ProjectType,
  ProjectStructure,
  FileNode,
  GitInfo,
  DependencyInfo,
} from './context.types';

const execAsync = promisify(exec);

export class ContextService {
  private projectPath: string;
  private cachedContext?: ProjectContext;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
  }

  async getContext(): Promise<ProjectContext> {
    if (this.cachedContext) {
      return this.cachedContext;
    }

    const [structure, git, dependencies, configs] = await Promise.all([
      this.getProjectStructure(),
      this.getGitInfo(),
      this.getDependencies(),
      this.getConfigs(),
    ]);

    const projectType = this.detectProjectType();

    this.cachedContext = {
      rootPath: this.projectPath,
      language: 'zh',
      projectType,
      structure,
      git,
      dependencies,
      configs,
    };

    return this.cachedContext;
  }

  async getProjectStructure(maxDepth = 5): Promise<ProjectStructure> {
    const rootNode = await this.walkDirectory(this.projectPath, 0, maxDepth);
    
    let totalFiles = 0;
    let totalLines = 0;
    
    function count(node: FileNode) {
      if (node.type === 'file') {
        totalFiles++;
        if (node.size) {
          totalLines += node.size / 50; // 估算行数
        }
      }
      if (node.children) {
        node.children.forEach(count);
      }
    }
    count(rootNode);

    return {
      files: rootNode.children || [],
      totalFiles,
      totalLines: Math.round(totalLines),
    };
  }

  private async walkDirectory(
    dirPath: string,
    depth: number,
    maxDepth: number
  ): Promise<FileNode> {
    const name = path.basename(dirPath);
    const relativePath = path.relative(this.projectPath, dirPath);
    
    const node: FileNode = {
      name,
      path: relativePath || '.',
      type: 'directory',
      children: [],
    };

    if (depth >= maxDepth) {
      return node;
    }

    try {
      const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        // 跳过隐藏文件和常见忽略目录
        if (entry.name.startsWith('.') && entry.name !== '.git') {
          continue;
        }
        if (['node_modules', '__pycache__', 'dist', 'build', 'target'].includes(entry.name)) {
          continue;
        }

        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          const childNode = await this.walkDirectory(fullPath, depth + 1, maxDepth);
          node.children!.push(childNode);
        } else {
          const stat = await fs.promises.stat(fullPath);
          node.children!.push({
            name: entry.name,
            path: path.relative(this.projectPath, fullPath),
            type: 'file',
            size: stat.size,
            extension: path.extname(entry.name),
          });
        }
      }
    } catch {
      // 忽略无权访问的目录
    }

    return node;
  }

  async getGitInfo(): Promise<GitInfo | undefined> {
    try {
      const { stdout: branch } = await execAsync('git branch --show-current', {
        cwd: this.projectPath,
      });
      
      const { stdout: status } = await execAsync('git status --porcelain', {
        cwd: this.projectPath,
      });

      let remote: string | undefined;
      try {
        const { stdout: remoteUrl } = await execAsync('git remote get-url origin', {
          cwd: this.projectPath,
        });
        remote = remoteUrl.trim();
      } catch {
        // 没有远程仓库
      }

      return {
        branch: branch.trim(),
        status: status.trim() === '' ? 'clean' : 'dirty',
        remote,
        rootDir: this.projectPath,
      };
    } catch {
      return undefined;
    }
  }

  async getDependencies(): Promise<DependencyInfo | undefined> {
    // Node.js
    const packageJsonPath = path.join(this.projectPath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      try {
        const content = fs.readFileSync(packageJsonPath, 'utf-8');
        const pkg = JSON.parse(content);
        
        return {
          packageManager: this.detectPackageManager(),
          dependencies: Object.keys(pkg.dependencies || {}),
          devDependencies: Object.keys(pkg.devDependencies || {}),
        };
      } catch {
        // 解析失败
      }
    }

    // Python
    const requirementsPath = path.join(this.projectPath, 'requirements.txt');
    if (fs.existsSync(requirementsPath)) {
      try {
        const content = fs.readFileSync(requirementsPath, 'utf-8');
        const dependencies = content.split('\n').filter(l => l.trim() && !l.startsWith('#'));
        
        return {
          packageManager: 'pip',
          dependencies,
          devDependencies: [],
        };
      } catch {
        // 读取失败
      }
    }

    return undefined;
  }

  private detectPackageManager(): 'npm' | 'pnpm' | 'yarn' {
    if (fs.existsSync(path.join(this.projectPath, 'pnpm-lock.yaml'))) {
      return 'pnpm';
    }
    if (fs.existsSync(path.join(this.projectPath, 'yarn.lock'))) {
      return 'yarn';
    }
    return 'npm';
  }

  private detectProjectType(): ProjectType {
    const files = fs.readdirSync(this.projectPath);
    
    // Node.js
    if (files.includes('package.json')) {
      try {
        const pkg = JSON.parse(fs.readFileSync(
          path.join(this.projectPath, 'package.json'),
          'utf-8'
        ));
        
        if (pkg.dependencies?.react || pkg.devDependencies?.react) {
          return 'frontend';
        }
        if (pkg.dependencies?.vue || pkg.devDependencies?.vue) {
          return 'frontend';
        }
        if (pkg.dependencies?.express || pkg.dependencies?.koa || pkg.dependencies?.fastify) {
          return 'backend';
        }
        return 'node';
      } catch {
        return 'unknown';
      }
    }

    // Python
    if (files.includes('requirements.txt') || files.includes('setup.py') || files.includes('pyproject.toml')) {
      return 'python';
    }

    // Go
    if (files.includes('go.mod')) {
      return 'go';
    }

    // Rust
    if (files.includes('Cargo.toml')) {
      return 'rust';
    }

    // Java
    if (files.some(f => f.endsWith('.java')) || files.includes('pom.xml') || files.includes('build.gradle')) {
      return 'java';
    }

    return 'unknown';
  }

  async getConfigs(): Promise<Record<string, any>> {
    const configs: Record<string, any> = {};
    
    const configFiles = [
      'tsconfig.json',
      'jsconfig.json',
      '.eslintrc.json',
      '.prettierrc',
      'vite.config.ts',
      'webpack.config.js',
      'next.config.js',
      '.gitignore',
    ];

    for (const file of configFiles) {
      const filePath = path.join(this.projectPath, file);
      if (fs.existsSync(filePath)) {
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          if (file.endsWith('.json')) {
            configs[file] = JSON.parse(content);
          } else {
            configs[file] = content;
          }
        } catch {
          configs[file] = null;
        }
      }
    }

    return configs;
  }

  invalidateCache(): void {
    this.cachedContext = undefined;
  }
}
```

---

## 5. Context 使用示例

```typescript
// 获取项目上下文
const contextService = new ContextService('/path/to/project');
const context = await contextService.getContext();

console.log(context);
// {
//   rootPath: '/path/to/project',
//   projectType: 'frontend',
//   structure: { files: [...], totalFiles: 100 },
//   git: { branch: 'main', status: 'clean', remote: '...' },
//   dependencies: { packageManager: 'pnpm', dependencies: [...], devDependencies: [...] },
//   configs: { 'tsconfig.json': {...}, 'package.json': {...} }
// }
```

---

## 6. 上下文注入到 AI

在 ReAct Agent 中，会将上下文信息注入到 System Prompt：

```typescript
function buildContextPrompt(context: ProjectContext): string {
  return `
## 项目上下文

- 项目路径: ${context.rootPath}
- 项目类型: ${context.projectType}
- Git 分支: ${context.git?.branch || 'N/A'}
- 包管理器: ${context.dependencies?.packageManager || 'N/A'}

## 项目结构
${formatFileTree(context.structure.files)}

## 依赖
- 生产依赖: ${context.dependencies?.dependencies.join(', ') || '无'}
- 开发依赖: ${context.dependencies?.devDependencies.join(', ') || '无'}
`;
}

function formatFileTree(files: FileNode[], indent = ''): string {
  return files.map(f => {
    if (f.type === 'directory') {
      return `${indent}📁 ${f.name}/\n${formatFileTree(f.children || [], indent + '  ')}`;
    }
    return `${indent}📄 ${f.name}`;
  }).join('\n');
}
```

---

## 7. 与 AI 的交互

上下文会在以下时机注入：

1. **会话开始时** - 加载项目上下文
2. **用户切换项目时** - 重新加载上下文
3. **用户请求时** - 按需获取特定上下文

```
用户: 帮我看看这个项目用了什么技术
    ↓
ContextService.getContext()
    ↓
ProjectContext
    ↓
注入 System Prompt
    ↓
AI 分析并回答
```
