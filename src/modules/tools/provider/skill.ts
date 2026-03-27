/**
 * Skill Tool for Provider Mode
 */

import path from 'path'
import { pathToFileURL } from 'url'
import { skillsManager } from '../../skill/skills.manager.js'
import { Tool, ToolContext, ToolResult } from '../tool.types.js'

export const skillTool: Tool = {
  name: 'skill',
  description: 'Load and view a skill guide. Use to access specialized knowledge and best practices for specific tasks.',
  parameters: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Skill name to load'
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
      `Base directory: ${base}`,
      'Files in this skill directory:',
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
