/**
 * Skill 模块测试
 * 按照 skill-guide.md 规范实现
 */

import * as fs from 'fs';
import * as path from 'path';
import { SkillsManager } from '../../src/modules/skill/skills.manager';
import { skillHandler } from '../../src/modules/skill/skill.tool';
import { buildAvailableSkillsPrompt } from '../../src/modules/skill/skill.tool';
import { skillsManager as globalSkillsManager } from '../../src/modules/skill/skills.manager';

describe('Skill 模块', () => {
  let manager: SkillsManager;
  const testDir = path.join(__dirname, 'test-skills');

  beforeEach(() => {
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    manager = new SkillsManager(testDir);
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('SKILL.md 解析', () => {
    test('应该解析带 frontmatter 的 SKILL.md', async () => {
      const skillDir = path.join(testDir, 'test-skill');
      fs.mkdirSync(skillDir, { recursive: true });
      fs.writeFileSync(
        path.join(skillDir, 'SKILL.md'),
        `---
name: test-skill
description: 测试 Skill 描述
license: MIT
---
## What I do
这是一个测试 Skill。
## When to use me
测试时使用。`
      );

      const skill = await manager.loadSkill(path.join(skillDir, 'SKILL.md'));
      expect(skill).not.toBeNull();
      expect(skill?.name).toBe('test-skill');
      expect(skill?.description).toBe('测试 Skill 描述');
      expect(skill?.license).toBe('MIT');
      expect(skill?.rawContent).toContain('What I do');
    });

    test('应该拒绝无效的 name（含大写）', async () => {
      const skillDir = path.join(testDir, 'Invalid-Name');
      fs.mkdirSync(skillDir, { recursive: true });
      fs.writeFileSync(
        path.join(skillDir, 'SKILL.md'),
        `---
name: Invalid-Name
description: 无效名称
---`
      );

      const skill = await manager.loadSkill(path.join(skillDir, 'SKILL.md'));
      expect(skill).toBeNull();
    });

    test('应该拒绝 name 与目录名不匹配', async () => {
      const skillDir = path.join(testDir, 'skill-a');
      fs.mkdirSync(skillDir, { recursive: true });
      fs.writeFileSync(
        path.join(skillDir, 'SKILL.md'),
        `---
name: skill-b
description: 名称不匹配
---`
      );

      const skill = await manager.loadSkill(path.join(skillDir, 'SKILL.md'));
      expect(skill).toBeNull();
    });
  });

  describe('name 验证', () => {
    test('有效名称应该通过验证', async () => {
      const validNames = ['test', 'test-skill', 'my-skill-123', 'a1b2c3'];
      for (const name of validNames) {
        const skillDir = path.join(testDir, name);
        fs.mkdirSync(skillDir, { recursive: true });
        fs.writeFileSync(
          path.join(skillDir, 'SKILL.md'),
          `---
name: ${name}
description: 测试
---`
        );
        const skill = await manager.loadSkill(path.join(skillDir, 'SKILL.md'));
        expect(skill?.name).toBe(name);
      }
    });

    test('无效名称应该被拒绝', async () => {
      const invalidNames = ['-test', 'test-', 'test--skill', 'TEST', 'test_skill'];
      for (const name of invalidNames) {
        const skillDir = path.join(testDir, `dir-${name}`);
        fs.mkdirSync(skillDir, { recursive: true });
        fs.writeFileSync(
          path.join(skillDir, 'SKILL.md'),
          `---
name: ${name}
description: 测试
---`
        );
        const skill = await manager.loadSkill(path.join(skillDir, 'SKILL.md'));
        expect(skill).toBeNull();
      }
    });
  });

  describe('权限控制', () => {
    test('deny 权限应该隐藏 Skill', async () => {
      const skillDir = path.join(testDir, 'internal-secret');
      fs.mkdirSync(skillDir, { recursive: true });
      const skillPath = path.join(skillDir, 'SKILL.md');
      fs.writeFileSync(
        skillPath,
        `---
name: internal-secret
description: 秘密 Skill
---`
      );

      manager.setPermissions({ 'internal-*': 'deny' });
      await manager.loadSkill(skillPath);

      expect(manager.has('internal-secret')).toBe(false);
    });

    test('allow 权限应该显示 Skill', async () => {
      const skillDir = path.join(testDir, 'public-skill');
      fs.mkdirSync(skillDir, { recursive: true });
      const skillPath = path.join(skillDir, 'SKILL.md');
      fs.writeFileSync(
        skillPath,
        `---
name: public-skill
description: 公开 Skill
---`
      );

      manager.setPermissions({ '*': 'allow' });
      await manager.loadSkill(skillPath);

      expect(manager.has('public-skill')).toBe(true);
    });
  });

  describe('skill 工具', () => {
    test('应该返回 Skill 内容', async () => {
      const skillDir = path.join(testDir, 'demo-skill');
      fs.mkdirSync(skillDir, { recursive: true });
      const skillPath = path.join(skillDir, 'SKILL.md');
      fs.writeFileSync(
        skillPath,
        `---
name: demo-skill
description: Demo Skill
---
## What I do
Demo content.`
      );

      const skill = await manager.loadSkill(skillPath);
      expect(skill).not.toBeNull();
      expect(skill?.name).toBe('demo-skill');
      expect(skill?.rawContent).toContain('Demo content');
    });

    test('不存在的 Skill 应该返回错误', async () => {
      const result = await skillHandler({ name: 'non-existent' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('AI 集成', () => {
    test('buildAvailableSkillsPrompt 应该生成 XML 格式', async () => {
      const prompt = buildAvailableSkillsPrompt();

      expect(prompt).toContain('<available_skills>');
      expect(prompt).toContain('</available_skills>');
    });

    test('getAvailableSkills 应该返回技能列表', async () => {
      const skillDir = path.join(testDir, 'xml-skill');
      fs.mkdirSync(skillDir, { recursive: true });
      const skillPath = path.join(skillDir, 'SKILL.md');
      fs.writeFileSync(
        skillPath,
        `---
name: xml-skill
description: XML 测试
---`
      );

      const skill = await manager.loadSkill(skillPath);
      expect(skill?.name).toBe('xml-skill');

      const skills = manager.getAvailableSkills();
      expect(skills.some(s => s.name === 'xml-skill')).toBe(true);
    });
  });

  describe('搜索路径', () => {
    test('应该返回 6 个搜索路径', () => {
      const paths = manager.getSearchPaths();
      expect(paths.length).toBe(6);
    });

    test('应该包含 .txcode/skills 路径', () => {
      const paths = manager.getSearchPaths();
      const hasTxcode = paths.some(p => p.includes('.txcode'));
      expect(hasTxcode).toBe(true);
    });
  });
});
