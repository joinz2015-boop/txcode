/**
 * Context 模块类型定义
 */

export interface ProjectContext {
  rootPath: string;
  gitBranch?: string;
  gitStatus?: string;
  gitRemote?: string;
  packageJson?: Record<string, any>;
  language: string;
  framework?: string;
  dependencies?: string[];
  devDependencies?: string[];
  fileStructure?: FileNode[];
  readme?: string;
}

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
}

export interface GitInfo {
  branch: string;
  status: string;
  remote: string;
  lastCommit: string;
  author: string;
}