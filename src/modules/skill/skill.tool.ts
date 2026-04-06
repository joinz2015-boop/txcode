/**
 * Skill 工具
 * 按照 skill-guide.md 规范实现
 */

import path from 'path'
import { pathToFileURL } from 'url'
import { skillsManager } from './skills.manager.js'
import { Tool, ToolContext, ToolResult } from '../tools/tool.types.js'

export const skillTool: Tool = {
  name: 'skill',
  description: '',
  descriptionFile: 'skill.txt',
  parameters: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Skill 名称'
      }
    },
    required: ['name']
  },
  execute: async (params: { name: string }, context: ToolContext): Promise<ToolResult> => {
    await skillsManager.loadAll()
    const skill = skillsManager.getSkill(params.name)

    if (!skill) {
      const available = skillsManager.getAvailableSkills()
      const availableList = available.length > 0 ? available.map(s => s.name).join(', ') : 'none'
      return {
        success: false,
        output: '',
        error: `Skill "${params.name}" not found. Available skills: ${availableList}`
      }
    }

    const dir = path.dirname(skill.filePath)
    const base = pathToFileURL(dir).href

    const files: string[] = []
    try {
      const entries = await import('fs/promises').then(fs => fs.readdir(dir))
      for (const entry of entries.slice(0, 10)) {
        if (entry !== 'SKILL.md') {
          files.push(path.resolve(dir, entry))
        }
      }
    } catch {}

    const output = [
      `<skill_content name="${skill.name}">`,
      `# Skill: ${skill.name}`,
      '',
      skill.rawContent.trim(),
      '',
      `Base directory for this skill: ${base}`,
      'Relative paths in this skill (e.g., scripts/, reference/) are relative to this base directory.',
      'Note: file list is sampled.',
      '',
      '<skill_files>',
      files.map(f => `<file>${f}</file>`).join('\n'),
      '</skill_files>',
      '</skill_content>'
    ].join('\n')

    return {
      success: true,
      output,
      metadata: { name: skill.name, dir }
    }
  }
}

export async function buildAvailableSkillsPrompt(): Promise<string> {
  await skillsManager.loadAll()
  const skills = skillsManager.getAvailableSkills()

  if (skills.length === 0) {
    return '<available_skills>\n  (无可用 Skills)\n</available_skills>'
  }

  const skillsXml = skills
    .map(s => `  <skill>\n    <name>${s.name}</name>\n    <path>${s.filePath}</path>\n    <description>${s.description}</description>\n  </skill>`)
    .join('\n')

  return `<available_skills>\n${skillsXml}\n</available_skills>`
}

export async function skillHandler(args: { name: string }): Promise<{ success: boolean; data?: { name: string; description: string; content: string }; error?: string }> {
  const result = await skillTool.execute(args, {} as ToolContext)
  if (!result.success) {
    return { success: false, error: result.error }
  }
  return {
    success: true,
    data: {
      name: args.name,
      description: '',
      content: result.output
    }
  }
}
