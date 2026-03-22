/**
 * Skill 服务
 * 
 * 职责：
 * - Skill 加载和解析
 * - Skill 管理
 * - Skill 执行
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { Skill, SkillExample } from './skill.types.js';

export class SkillService {
  private skills: Map<string, Skill> = new Map();
  private skillsDir: string;

  constructor(skillsDir?: string) {
    this.skillsDir = skillsDir || this.getDefaultSkillsDir();
    this.loadBuiltinSkills();
  }

  /**
   * 获取默认 Skills 目录
   */
  private getDefaultSkillsDir(): string {
    const home = process.env.HOME || process.env.USERPROFILE || '.';
    return path.join(home, '.txcode', 'skills');
  }

  /**
   * 加载内置 Skills
   */
  private loadBuiltinSkills(): void {
    const builtinSkills = this.getBuiltinSkills();
    for (const skill of builtinSkills) {
      this.skills.set(skill.name, skill);
    }
  }

  /**
   * 获取内置 Skills
   */
  private getBuiltinSkills(): Skill[] {
    return [
      {
        name: 'code_review',
        description: '代码审查：分析代码质量，找出问题和改进点',
        instructions: `你是一个代码审查专家。请对提供的代码进行全面审查：

1. **代码质量**：检查命名规范、代码风格、可读性
2. **潜在问题**：查找 bug、安全漏洞、性能问题
3. **最佳实践**：检查是否遵循最佳实践
4. **改进建议**：提供具体的改进建议

请用中文回复，格式清晰，重点突出。`,
        tools: ['read_file', 'search_content', 'find_files'],
        examples: [
          {
            input: '请审查 src/utils.ts 文件',
            output: '我将对 src/utils.ts 进行代码审查...',
          },
        ],
      },
      {
        name: 'refactor',
        description: '代码重构：重构代码以提高质量和可维护性',
        instructions: `你是一个代码重构专家。请帮助重构代码：

1. **分析现状**：理解代码当前结构和问题
2. **重构方案**：提出重构方案和理由
3. **逐步实施**：小步重构，确保每步正确
4. **验证结果**：确保重构后功能不变

重构原则：
- 保持小步前进
- 每步都可测试
- 遵循 SOLID 原则
- 提高代码可读性`,
        tools: ['read_file', 'write_file', 'edit_file', 'search_content'],
        examples: [
          {
            input: '重构 src/handler.ts 使其更易维护',
            output: '我将分析并重构 src/handler.ts...',
          },
        ],
      },
      {
        name: 'debug',
        description: '调试问题：分析和修复代码中的问题',
        instructions: `你是一个调试专家。请帮助定位和修复问题：

1. **复现问题**：理解问题的具体表现
2. **定位原因**：通过日志、断点、代码分析找到原因
3. **修复方案**：提出修复方案并实施
4. **验证修复**：确保问题已解决

调试技巧：
- 从错误信息入手
- 检查最近修改的代码
- 使用二分法定位问题
- 添加日志输出`,
        tools: ['read_file', 'search_content', 'execute_bash', 'find_files'],
        examples: [
          {
            input: '用户登录时报 500 错误，请帮忙调试',
            output: '我来帮你调试这个登录错误...',
          },
        ],
      },
      {
        name: 'write_tests',
        description: '编写测试：为代码编写单元测试',
        instructions: `你是一个测试专家。请帮助编写高质量的测试：

1. **分析代码**：理解需要测试的功能
2. **设计用例**：覆盖正常、边界、异常情况
3. **编写测试**：使用项目现有的测试框架
4. **确保覆盖**：测试关键路径和边界条件

测试原则：
- AAA 模式（Arrange-Act-Assert）
- 每个测试只测一个场景
- 测试名称要清晰描述场景
- 使用 mock 隔离外部依赖`,
        tools: ['read_file', 'write_file', 'search_content', 'execute_bash'],
        examples: [
          {
            input: '为 src/utils.ts 编写测试',
            output: '我来为 src/utils.ts 编写测试...',
          },
        ],
      },
      {
        name: 'explain',
        description: '解释代码：详细解释代码的工作原理',
        instructions: `你是一个代码解释专家。请详细解释代码：

1. **整体结构**：先概述代码的整体结构
2. **关键组件**：解释主要函数、类、模块
3. **执行流程**：描述代码的执行流程
4. **设计思路**：解释背后的设计思路

解释方式：
- 从整体到局部
- 用通俗易懂的语言
- 配合示例说明
- 指出关键细节`,
        tools: ['read_file', 'search_content', 'find_files'],
        examples: [
          {
            input: '解释 src/main.ts 的工作原理',
            output: '我来解释 src/main.ts 的工作原理...',
          },
        ],
      },
    ];
  }

  /**
   * 从文件加载 Skill
   */
  loadSkillFromFile(filePath: string): Skill | null {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const skill = this.parseSkill(content);
      if (skill) {
        skill.path = filePath;
        this.skills.set(skill.name, skill);
      }
      return skill;
    } catch {
      return null;
    }
  }

  /**
   * 从目录加载 Skills
   */
  loadSkillsFromDir(dirPath?: string): number {
    const targetDir = dirPath || this.skillsDir;
    
    if (!fs.existsSync(targetDir)) {
      return 0;
    }
    
    const files = fs.readdirSync(targetDir);
    let count = 0;
    
    for (const file of files) {
      if (file.endsWith('.yaml') || file.endsWith('.yml')) {
        const skill = this.loadSkillFromFile(path.join(targetDir, file));
        if (skill) count++;
      }
    }
    
    return count;
  }

  loadAll(): void {
    this.loadSkillsFromDir();
  }

  /**
   * 解析 Skill
   */
  private parseSkill(content: string): Skill | null {
    try {
      const data = yaml.load(content) as any;
      if (data && data.name && data.instructions) {
        return {
          name: data.name,
          description: data.description || '',
          instructions: data.instructions,
          tools: data.tools || [],
          examples: data.examples || [],
          metadata: data.metadata,
        };
      }
    } catch {}
    return null;
  }

  /**
   * 获取 Skill
   */
  get(name: string): Skill | undefined {
    return this.skills.get(name);
  }

  /**
   * 获取所有 Skills
   */
  getAll(): Skill[] {
    return Array.from(this.skills.values());
  }

  /**
   * 注册 Skill
   */
  register(skill: Skill): void {
    this.skills.set(skill.name, skill);
  }

  /**
   * 移除 Skill
   */
  remove(name: string): boolean {
    return this.skills.delete(name);
  }

  /**
   * 检查 Skill 是否存在
   */
  has(name: string): boolean {
    return this.skills.has(name);
  }

  /**
   * 获取 Skill 的系统提示
   */
  getSystemPrompt(skillName: string): string | undefined {
    const skill = this.skills.get(skillName);
    if (!skill) return undefined;

    let prompt = skill.instructions;

    if (skill.tools && skill.tools.length > 0) {
      prompt += `\n\n可用工具: ${skill.tools.join(', ')}`;
    }

    return prompt;
  }

  /**
   * 搜索 Skills
   */
  search(query: string): Skill[] {
    const lowerQuery = query.toLowerCase();
    return this.getAll().filter(
      skill =>
        skill.name.toLowerCase().includes(lowerQuery) ||
        skill.description.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * 将 Skill 导出为 YAML
   */
  exportToYaml(skillName: string): string | undefined {
    const skill = this.skills.get(skillName);
    if (!skill) return undefined;

    const data: Record<string, any> = {
      name: skill.name,
      description: skill.description,
      instructions: skill.instructions,
    };

    if (skill.tools && skill.tools.length > 0) {
      data.tools = skill.tools;
    }

    if (skill.examples && skill.examples.length > 0) {
      data.examples = skill.examples;
    }

    if (skill.metadata) {
      data.metadata = skill.metadata;
    }

    return yaml.dump(data, { indent: 2 });
  }
}

export const skillService = new SkillService();