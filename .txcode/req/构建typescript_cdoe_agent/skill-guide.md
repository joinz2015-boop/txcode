# Skill 模块设计

## 1. Skill 概述

Skill 是可复用的行为模块，参考 OpenCode 规范，通过 `SKILL.md` 文件定义。Skill 通过原生的 `skill` 工具按需加载。

---

## 2. Skill 文件格式

### 2.1 目录结构

```
skills/
├── <skill-name>/
│   └── SKILL.md           # Skill 定义文件
└── builtin/               # 内置 Skills (可选)
```

### 2.2 搜索路径

| 类型 | 路径 |
|------|------|
| 项目配置 | `.txcode/skills/<name>/SKILL.md` |
| 全局配置 | `~/.txcode/skills/<name>/SKILL.md` |
| Claude 兼容 | `.claude/skills/<name>/SKILL.md` |
| Claude 全局 | `~/.claude/skills/<name>/SKILL.md` |
| Agents 兼容 | `.agents/skills/<name>/SKILL.md` |
| Agents 全局 | `~/.agents/skills/<name>/SKILL.md` |

### 2.3 SKILL.md 格式

```markdown
---
name: <skill-name>
description: <描述信息，1-1024字符>
license: MIT (可选)
compatibility: opencode (可选)
metadata:
  key: value (可选)
---

## What I do
<Skill 的详细描述和使用说明>

## When to use me
<何时使用此 Skill>
```

### 2.4 name 验证规则

- 长度：1-64 字符
- 字符：小写字母和数字，可用单个连字符分隔
- 不以 `-` 开头或结尾
- 不含连续的 `--`
- 与目录名称一致

正则：`^[a-z0-9]+(-[a-z0-9]+)*$`

---

## 3. Skill 示例

### 3.1 git-release Skill

创建 `.txcode/skills/git-release/SKILL.md`：

```markdown
---
name: git-release
description: Create consistent releases and changelogs
license: MIT
compatibility: txcode
metadata:
  audience: maintainers
  workflow: github
---

## What I do
- Draft release notes from merged PRs
- Propose a version bump
- Provide a copy-pasteable `gh release create` command

## When to use me
Use this when you are preparing a tagged release.
Ask clarifying questions if the target versioning scheme is unclear.
```

### 3.2 react-helper Skill

```markdown
---
name: react-helper
description: 创建 React 组件和页面
---

## What I do
- 创建 React 函数组件
- 创建页面组件
- 生成组件测试文件

## When to use me
需要创建新的 React 组件或页面时使用。
```

---

## 4. Skill 加载机制

### 4.1 发现机制

1. 从当前工作目录向上遍历到 git 根目录
2. 加载所有匹配的 `skills/*/SKILL.md`
3. 同时加载全局 `~/.txcode/skills/*/SKILL.md`
4. 兼容加载 `.claude/skills/*/SKILL.md` 和 `.agents/skills/*/SKILL.md`

### 4.2 加载流程

```
┌─────────────────────────────────────────────────────────────┐
│                    Skill 发现流程                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. 遍历项目目录                                             │
│     .txcode/skills/*/SKILL.md                               │
│                                                              │
│  2. 遍历全局目录                                             │
│     ~/.txcode/skills/*/SKILL.md                             │
│                                                              │
│  3. 兼容路径                                                 │
│     .claude/skills/*/SKILL.md                               │
│     .agents/skills/*/SKILL.md                               │
│                                                              │
│  4. 解析 frontmatter                                         │
│     name + description                                       │
│                                                              │
│  5. 注册到 Skill Manager                                     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Skill 工具

### 5.1 内置 skill 工具

```typescript
// 工具名: skill
// 描述: 加载一个 Skill，获取其完整内容

// 参数:
{
  "name": "git-release"  // Skill 名称
}
```

### 5.2 工具描述格式

在 AI 可用的工具列表中，Skill 显示为：

```
<available_skills>
  <skill>
    <name>git-release</name>
    <description>Create consistent releases and changelogs</description>
  </skill>
</available_skills>
```

---

## 6. Skill Manager 实现

```typescript
// modules/skills/skills.manager.ts

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

export interface Skill {
  name: string;
  description: string;
  license?: string;
  compatibility?: string;
  metadata?: Record<string, string>;
  content: string;          // SKILL.md 完整内容
  rawContent: string;       // 去除 frontmatter 后的内容
  filePath: string;
}

export interface SkillMetadata {
  name: string;
  description: string;
  license?: string;
  compatibility?: string;
  metadata?: Record<string, string>;
}

export class SkillsManager {
  private skills: Map<string, Skill> = new Map();
  private searchPaths: string[] = [];

  constructor() {
    this.initSearchPaths();
  }

  private initSearchPaths() {
    const home = process.env.HOME || process.env.USERPROFILE || '';
    const cwd = process.cwd();

    // 项目路径
    this.searchPaths = [
      path.join(cwd, '.txcode', 'skills'),
      path.join(cwd, '.claude', 'skills'),
      path.join(cwd, '.agents', 'skills'),
    ];

    // 全局路径
    this.searchPaths.push(
      path.join(home, '.txcode', 'skills'),
      path.join(home, '.claude', 'skills'),
      path.join(home, '.agents', 'skills'),
    );
  }

  async loadAll(): Promise<void> {
    for (const searchPath of this.searchPaths) {
      await this.loadDir(searchPath);
    }
  }

  private async loadDir(dir: string): Promise<void> {
    if (!fs.existsSync(dir)) return;

    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const skillPath = path.join(dir, entry.name, 'SKILL.md');
          if (fs.existsSync(skillPath)) {
            await this.loadSkill(skillPath);
          }
        }
      }
    } catch (e) {
      // 忽略无权访问的目录
    }
  }

  async loadSkill(filePath: string): Promise<Skill | null> {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const skill = this.parseSkill(content, filePath);
      this.skills.set(skill.name, skill);
      return skill;
    } catch (e) {
      console.warn(`Failed to load skill from ${filePath}:`, e);
      return null;
    }
  }

  private parseSkill(content: string, filePath: string): Skill {
    // 解析 frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    
    if (!frontmatterMatch) {
      // 没有 frontmatter，整个内容作为描述
      return {
        name: path.basename(path.dirname(filePath)),
        description: content.substring(0, 1024),
        content: content,
        rawContent: content,
        filePath,
      };
    }

    const frontmatterStr = frontmatterMatch[1];
    const rawContent = frontmatterMatch[2];
    
    const metadata = yaml.load(frontmatterStr) as SkillMetadata;

    // 验证 name
    if (!this.validateName(metadata.name)) {
      throw new Error(`Invalid skill name: ${metadata.name}`);
    }

    return {
      name: metadata.name,
      description: metadata.description || '',
      license: metadata.license,
      compatibility: metadata.compatibility,
      metadata: metadata.metadata,
      content: content,
      rawContent: rawContent.trim(),
      filePath,
    };
  }

  private validateName(name: string): boolean {
    if (!name || name.length > 64) return false;
    const regex = /^[a-z0-9]+(-[a-z0-9]+)*$/;
    return regex.test(name) && !name.startsWith('-') && !name.includes('--');
  }

  getSkill(name: string): Skill | undefined {
    return this.skills.get(name);
  }

  getAllSkills(): Skill[] {
    return Array.from(this.skills.values());
  }

  getAvailableSkills(): { name: string; description: string }[] {
    return this.getAllSkills().map(s => ({
      name: s.name,
      description: s.description,
    }));
  }
}

export const skillsManager = new SkillsManager();
```

---

## 7. skill 工具实现

```typescript
// modules/skills/skill.tool.ts

import { skillsManager, Skill } from './skills.manager';

export const skillTool = {
  name: 'skill',
  description: '加载一个 Skill，获取其完整内容和使用说明',
  parameters: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Skill 名称'
      }
    },
    required: ['name']
  }
};

export interface SkillResult {
  success: boolean;
  data?: {
    name: string;
    description: string;
    content: string;
  };
  error?: string;
}

export async function skillHandler(args: { name: string }): Promise<SkillResult> {
  const skill = skillsManager.getSkill(args.name);
  
  if (!skill) {
    return {
      success: false,
      error: `Skill not found: ${args.name}`
    };
  }

  return {
    success: true,
    data: {
      name: skill.name,
      description: skill.description,
      content: skill.rawContent,
    }
  };
}
```

---

## 8. 权限配置

在 `txcode.json` 中配置：

```json
{
  "permission": {
    "skill": {
      "*": "allow",
      "git-*": "allow",
      "internal-*": "deny",
      "experimental-*": "ask"
    }
  }
}
```

| 权限 | 行为 |
|------|------|
| `allow` | 技能立即加载 |
| `deny` | 对代理隐藏技能，拒绝访问 |
| `ask` | 加载前提示用户确认 |

---

## 9. 与 AI 的集成

### 9.1 提示词中的可用 Skills

```typescript
function buildAvailableSkillsPrompt(): string {
  const skills = skillsManager.getAvailableSkills();
  
  if (skills.length === 0) {
    return '<available_skills>\n  (无可用 Skills)\n</available_skills>';
  }

  const skillsXml = skills.map(s => 
    `  <skill>\n    <name>${s.name}</name>\n    <description>${s.description}</description>\n  </skill>`
  ).join('\n');

  return `<available_skills>\n${skillsXml}\n</available_skills>`;
}
```

### 9.2 加载 Skill 的响应

当 AI 调用 `skill({ name: "xxx" })` 时：

```json
{
  "success": true,
  "data": {
    "name": "git-release",
    "description": "Create consistent releases and changelogs",
    "content": "## What I do\n- Draft release notes..."
  }
}
```

---

## 10. 排查加载问题

如果某个 Skill 没有显示：

1. 确认 `SKILL.md` 文件名全部为大写
2. 检查 frontmatter 是否包含 `name` 和 `description`
3. 确保 Skill 名称唯一
4. 检查 frontmatter 的 `name` 与目录名称一致
5. 验证 name 格式：`^[a-z0-9]+(-[a-z0-9]+)*$`
6. 检查权限设置（deny 的 Skill 会被隐藏）
