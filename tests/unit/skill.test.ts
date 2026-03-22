/**
 * Skill 模块测试
 */

import * as fs from 'fs';
import * as path from 'path';
import { SkillService } from '../../src/modules/skill/skill.service';

describe('Skill 模块', () => {
  let skillService: SkillService;
  const testDir = path.join(__dirname, 'test-skills');

  beforeEach(() => {
    skillService = new SkillService(testDir);
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('内置 Skills', () => {
    test('应该加载 5 个内置 Skills', () => {
      const skills = skillService.getAll();
      expect(skills.length).toBe(5);
    });

    test('应该包含 code_review Skill', () => {
      expect(skillService.has('code_review')).toBe(true);
    });

    test('应该包含 refactor Skill', () => {
      expect(skillService.has('refactor')).toBe(true);
    });

    test('应该包含 debug Skill', () => {
      expect(skillService.has('debug')).toBe(true);
    });

    test('应该包含 write_tests Skill', () => {
      expect(skillService.has('write_tests')).toBe(true);
    });

    test('应该包含 explain Skill', () => {
      expect(skillService.has('explain')).toBe(true);
    });
  });

  describe('Skill 管理', () => {
    test('get() 应该返回 Skill', () => {
      const skill = skillService.get('code_review');
      expect(skill?.name).toBe('code_review');
      expect(skill?.description).toContain('代码审查');
    });

    test('get() 不存在的 Skill 应该返回 undefined', () => {
      const skill = skillService.get('non_existent');
      expect(skill).toBeUndefined();
    });

    test('register() 应该注册新 Skill', () => {
      skillService.register({
        name: 'custom_skill',
        description: '自定义 Skill',
        instructions: '自定义指令',
      });

      expect(skillService.has('custom_skill')).toBe(true);
    });

    test('remove() 应该移除 Skill', () => {
      skillService.register({
        name: 'temp_skill',
        description: '临时',
        instructions: '临时指令',
      });

      skillService.remove('temp_skill');
      expect(skillService.has('temp_skill')).toBe(false);
    });

    test('search() 应该搜索 Skills', () => {
      const results = skillService.search('代码');
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('系统提示', () => {
    test('getSystemPrompt() 应该返回系统提示', () => {
      const prompt = skillService.getSystemPrompt('code_review');
      expect(prompt).toContain('代码审查');
    });

    test('getSystemPrompt() 不存在的 Skill 应该返回 undefined', () => {
      const prompt = skillService.getSystemPrompt('non_existent');
      expect(prompt).toBeUndefined();
    });
  });

  describe('YAML 导出', () => {
    test('exportToYaml() 应该导出 YAML', () => {
      const yaml = skillService.exportToYaml('code_review');
      expect(yaml).toContain('name: code_review');
      expect(yaml).toContain('description:');
    });
  });

  describe('从文件加载', () => {
    test('loadSkillFromFile() 应该加载 YAML 文件', () => {
      const yamlPath = path.join(testDir, 'test-skill.yaml');
      fs.writeFileSync(yamlPath, `
name: test_skill
description: Test skill
instructions: Test instructions
tools:
  - read_file
  - write_file
`);

      const skill = skillService.loadSkillFromFile(yamlPath);
      expect(skill?.name).toBe('test_skill');
      expect(skill?.tools).toContain('read_file');
    });
  });
});