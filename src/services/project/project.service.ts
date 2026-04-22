import * as path from 'path';
import { ProjectRepository, type Project } from '../../repository/project.repository.js';

export class ProjectService {
  private projectRepo = new ProjectRepository();

  getCurrentProject(): Project | null {
    return this.projectRepo.findActive();
  }

  getCurrentProjectPath(): string {
    const project = this.getCurrentProject();
    return project?.path || process.cwd();
  }

  getAllProjects(): Project[] {
    return this.projectRepo.findAll();
  }

  getProjectById(id: string | string[]): Project | null {
    return this.projectRepo.findById(id);
  }

  setCurrentProject(projectId: string | string[]): void {
    const normalizedId = Array.isArray(projectId) ? projectId[0] : projectId;
    const project = this.projectRepo.findById(normalizedId);
    if (!project) {
      throw new Error('Project not found');
    }
    this.projectRepo.setActive(normalizedId);
  }

  createProject(name: string, projectPath: string, description?: string): Project {
    const existing = this.projectRepo.findByPath(projectPath);
    if (existing) {
      this.projectRepo.setActive(existing.id);
      return existing;
    }
    return this.projectRepo.insert({ name, path: projectPath, description });
  }

  createOrGetProject(): Project {
    const cwd = process.cwd();
    const name = path.basename(cwd);
    return this.createProject(name, cwd);
  }

  deleteProject(projectId: string | string[]): void {
    const normalizedId = Array.isArray(projectId) ? projectId[0] : projectId;
    this.projectRepo.delete(normalizedId);
  }
}

export const projectService = new ProjectService();