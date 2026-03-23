/**
 * Skill 工具
 * 用于动态加载 Skill
 */

import { skillHandler } from '../../skill/skill.tool.js';

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
  execute: async (params: { name: string }) => {
    const result = await skillHandler(params);
    return JSON.stringify(result, null, 2);
  },
};