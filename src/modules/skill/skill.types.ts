/**
 * Skill 模块类型定义
 * 按照 skill-guide.md 规范实现
 */

export interface SkillMetadata {
  name: string;
  description: string;
  license?: string;
  compatibility?: string;
  metadata?: Record<string, string>;
}

export interface Skill extends SkillMetadata {
  content: string;
  rawContent: string;
  filePath: string;
}

export interface SkillToolParams {
  name: string;
}

export interface SkillToolResult {
  success: boolean;
  data?: {
    name: string;
    description: string;
    content: string;
  };
  error?: string;
}

export interface SkillPermission {
  pattern: string;
  action: 'allow' | 'deny' | 'ask';
}

export interface SkillsConfig {
  permissions?: Record<string, 'allow' | 'deny' | 'ask'>;
}

export interface AvailableSkill {
  name: string;
  description: string;
}
