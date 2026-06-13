/**
 * Skill 模块
 * 按照 skill-guide.md 规范实现
 */

export { SkillsManager, skillsManager } from './skills.manager.js';
export { SkillRepositoryService, skillRepositoryService } from './skill.repository.js';
export { skillTool, skillHandler, buildAvailableSkillsPrompt } from './skill.tool.js';
export type {
  Skill,
  SkillMetadata,
  SkillToolParams,
  SkillToolResult,
  SkillPermission,
  SkillsConfig,
  AvailableSkill,
} from './skill.types.js';
