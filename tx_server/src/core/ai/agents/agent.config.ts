import { configService } from '../../../service/config/config.service.js';
import { projectService } from '../../../service/project/project.service.js';

/** 查询 Agent 最大迭代次数（ai.maxIterations），查不到返回 fallback（默认 1000） */
export function getAgentMaxIterations(fallback: number = 1000): number {
  const v = configService.get<number>('ai.maxIterations');
  return typeof v === 'number' && v > 0 ? v : fallback;
}

/** 查询当前项目路径：激活项目路径 → process.cwd() */
export function getAgentProjectPath(): string {
  return projectService.getCurrentProjectPath() || process.cwd();
}

/** 查询上下文 token 上限（ai.context.maxTokens），查不到返回 fallback（默认 150000） */
export function getAgentMaxContextTokens(fallback: number = 150000): number {
  const v = configService.get<number>('ai.context.maxTokens');
  return typeof v === 'number' && v > 0 ? v : fallback;
}