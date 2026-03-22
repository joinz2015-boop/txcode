/**
 * Skill 模块类型定义
 */

export interface Skill {
  name: string;
  description: string;
  path?: string;
  instructions: string;
  tools?: string[];
  examples?: SkillExample[];
  metadata?: Record<string, any>;
}

export interface SkillExample {
  input: string;
  output: string;
}

export interface SkillFile {
  path: string;
  content: string;
}