/**
 * Skill 工具
 * 按照 skill-guide.md 规范实现
 */

import { skillsManager } from './skills.manager.js';
import { SkillToolParams, SkillToolResult } from './skill.types.js';

export const skillTool = {
  name: 'skill',
  description: '加载一个 Skill，获取其完整内容和使用说明',
  parameters: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Skill 名称',
      },
    },
    required: ['name'],
  },
};

export async function skillHandler(args: SkillToolParams): Promise<SkillToolResult> {
  const skill = skillsManager.getSkill(args.name);

  if (!skill) {
    return {
      success: false,
      error: `Skill not found: ${args.name}`,
    };
  }

  return {
    success: true,
    data: {
      name: skill.name,
      description: skill.description,
      content: skill.rawContent,
    },
  };
}

export async function buildAvailableSkillsPrompt(): Promise<string> {
  await skillsManager.loadAll();
  const skills = skillsManager.getAvailableSkills();

  if (skills.length === 0) {
    return '<available_skills>\n  (无可用 Skills)\n</available_skills>';
  }

  const skillsXml = skills
    .map(
      s => `  <skill>
    <name>${s.name}</name>
    <description>${s.description}</description>
  </skill>`
    )
    .join('\n');

  return `<available_skills>\n${skillsXml}\n</available_skills>`;
}
