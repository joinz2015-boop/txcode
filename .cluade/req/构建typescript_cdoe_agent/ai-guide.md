# AI 模块设计

## 1. AI 模块概述

AI 模块负责与 AI 服务提供商通信，采用 **ReAct (Reasoning + Acting)** 模式与 AI 交互。

---

## 2. ReAct 交互格式

### 2.1 格式设计

采用 **JSON + 占位符** 格式：

```
{
  "thought": "我需要先读取 package.json 了解项目依赖",
  "action": "readFile",
  "action_input": {
    "path": "package.json"
  }
}
---
{
  "observation": {"name": "my-project", "dependencies": {...}}
}
---
{
  "thought": "项目使用 React，需要创建一个组件",
  "action": "writeFile",
  "action_input": {
    "path": "src/components/Hello.tsx",
    "content": "$content:1"
  }
}
---
$content:1
import React from 'react';

interface Props {
  name: string;
}

export const Hello: React.FC<Props> = ({ name }) => {
  return <div>Hello {name}</div>;
};
---
{
  "observation": {"success": true}
}
---
{
  "thought": "组件已创建完成",
  "final_answer": "已成功创建 src/components/Hello.tsx"
}
```

### 2.2 格式规则

| 规则 | 说明 |
|------|------|
| JSON 对象 | 每个步骤/结果用 JSON 表示 |
| 分隔符 | 步骤之间用 `---` 分隔 |
| 占位符 | 大文本用 `$keyName` 格式引用 |
| 内容块 | `$keyName\n实际内容` 提供占位符对应内容 |

### 2.3 占位符格式

```
$keyName
实际内容（可以是多行）
```

---

## 3. ReAct 模式流程

```
┌─────────────────────────────────────────────────────────────┐
│                      ReAct 循环                             │
│                                                             │
│  ┌─────────┐                                               │
│  │ Thought │  AI 分析问题，决定下一步行动                    │
│  └────┬────┘                                               │
│       │                                                     │
│       ▼                                                     │
│  ┌─────────┐                                               │
│  │ Action  │  AI 调用工具                                   │
│  └────┬────┘                                               │
│       │                                                     │
│       ▼                                                     │
│  ┌─────────────┐                                           │
│  │ Tool Call   │  执行工具                                  │
│  └──────┬──────┘                                           │
│         │                                                   │
│         ▼                                                   │
│  ┌─────────────┐                                           │
│  │ Observation │  获取执行结果                              │
│  └──────┬──────┘                                           │
│         │                                                   │
│         └─── No ──→ 继续思考/行动（循环）                   │
│                │                                            │
│                Yes                                          │
│                │                                            │
│                ▼                                            │
│  ┌─────────────┐                                           │
│  │ Final Answer│  输出最终回答                             │
│  └─────────────┘                                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. AI 模块结构

```
modules/ai/
├── ai.types.ts           # 类型定义
├── ai.service.ts         # AI 服务主逻辑
├── providers/
│   └── openai.provider.ts   # OpenAI Provider
├── react/                # ReAct 模式实现
│   ├── react.agent.ts    # ReAct Agent
│   ├── react.parser.ts   # 输出解析器
│   ├── react.prompts.ts  # ReAct 提示词
│   └── react.types.ts    # ReAct 类型
├── tools/                # 工具模块
│   └── tools.manager.ts
└── index.ts
```

---

## 5. 类型定义

```typescript
// modules/ai/react/react.types.ts

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
    }>;
    required: string[];
  };
}

export interface ReActStep {
  thought: string;
  action: string;
  actionInput: Record<string, any>;
  observation?: any;
  error?: string;
  remember?: boolean;  // 是否永久记忆
}

export interface ReActResult {
  answer: string;
  steps: ReActStep[];
  iterations: number;
  success: boolean;
  error?: string;
}
```

---

## 6. 内置 Skill：loadSkill

### 6.1 工具定义

```typescript
// 工具名: loadSkill
// 描述: 加载一个 Skill MD 文件，获取该文件中的工具定义和使用方式

// 参数:
{
  "skillPath": "skills/my-skill.md"  // Skill 文件路径
}
```

### 6.2 Skill MD 文件格式

```markdown
# Skill Name: my-skill

## Description
这个 Skill 用于...

## Tools

### tool1
**描述**: 做某事
**参数**:
- `param1`: string - 参数1说明
- `param2`: number - 参数2说明

### tool2
**描述**: 做另一件事
**参数**:
- `path`: string - 文件路径
```

### 6.3 加载结果

加载后返回 Skill 中的工具列表，AI 可以使用这些工具。

---

## 7. ReAct 提示词

```typescript
// modules/ai/react/react.prompts.ts

import { ToolDefinition } from './react.types';

export const REACT_SYSTEM_PROMPT = `你是一个专业的 Coding Agent，帮助用户完成代码编写、调试、重构等任务。

你必须按照 ReAct (Reasoning + Acting) 模式工作：

1. **Thought**: 分析当前情况，思考下一步应该做什么
2. **Action**: 选择并执行一个工具
3. **Observation**: 观察工具执行结果，判断是否重要
4. 重复步骤 1-3 直到得到答案
5. **Final Answer**: 给出最终回答

## 记忆管理（重要）

每轮工具执行后，你需要判断工具结果是否重要：

**需要永久记忆的情况：**
- 创建/修改了重要文件
- 发现了项目关键信息（技术栈、依赖、配置）
- 用户需要记住的重要结论
- 任何后续任务可能依赖的信息

**可以遗忘的情况：**
- 读取文件的中间结果（如果不再需要）
- 调试用的临时输出
- 不影响后续任务的探索性结果

## 输出格式（重要）

输出必须是有效的 JSON 对象，不要包含其他文本：

**调用工具时：**
\`\`\`json
{
  "thought": "你的思考过程",
  "action": "工具名称",
  "action_input": {
    "参数名": "参数值"
  },
  "remember": true
}
\`\`\`

**大文本参数（如代码）使用占位符：**
\`\`\`json
{
  "thought": "需要创建一个组件",
  "action": "writeFile",
  "action_input": {
    "path": "src/components/Hello.tsx",
    "content": "$content:1"
  },
  "remember": true
}
\`\`\`
$content:1
实际的代码内容在这里

**返回最终答案时：**
\`\`\`json
{
  "thought": "任务已完成",
  "final_answer": "详细的完成结果"
}
\`\`\`

## 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `thought` | string | 你的思考过程 |
| `action` | string | 要执行的工具名称 |
| `action_input` | object | 工具参数 |
| `remember` | boolean | 是否将此结果永久记忆（默认 false） |
| `final_answer` | string | 最终回答（仅在任务完成时使用） |

## 内置工具

{builtinTools}

## 可用 Skills

{skills}

## 重要规则

- 优先使用内置工具
- 如果内置工具不足，使用 loadSkill 加载需要的 Skill
- 加载 Skill 后，其提供的工具会自动可用
- 每个步骤后用 \\n---\\n 分隔
- 如果工具执行失败，思考原因并尝试其他方法
- 谨慎设置 remember=true，只对重要结果记忆
`;

export function buildReActPrompt(
  builtinTools: ToolDefinition[],
  skills: { path: string; name: string; description: string }[],
  maxToolIterations: number = 10
): string {
  const builtinToolsDesc = builtinTools.map(t => 
    `- ${t.name}: ${t.description}\n  参数: ${JSON.stringify(t.parameters.properties, null, 2)}`
  ).join('\n');

  const skillsDesc = skills.map(s => 
    `- ${s.path}: ${s.name} - ${s.description}`
  ).join('\n');

  return REACT_SYSTEM_PROMPT
    .replace('{builtinTools}', builtinToolsDesc || '（无）')
    .replace('{skills}', skillsDesc || '（无）')
    .replace('{maxToolIterations}', String(maxToolIterations));
}
```

---

## 8. ReAct 解析器

```typescript
// modules/ai/react/react.parser.ts

import { ReActStep } from './react.types';

export class ReActParser {
  parse(content: string): { steps: ReActStep[]; finalAnswer: string } {
    const blocks = this.splitBlocks(content);
    const steps: ReActStep[] = [];
    const contentMap = new Map<string, string>();
    let finalAnswer = '';

    for (const block of blocks) {
      if (block.type === 'content') {
        contentMap.set(block.contentKey!, block.content || '');
      } else if (block.type === 'step') {
        const data = block.data;
        const replacedInput = this.replacePlaceholders(data.action_input, contentMap);
        
        if (data.final_answer) {
          finalAnswer = data.final_answer;
        } else {
          steps.push({
            thought: data.thought || '',
            action: data.action || '',
            actionInput: replacedInput,
            remember: data.remember || false,
          });
        }
      } else if (block.type === 'observation') {
        const lastStep = steps[steps.length - 1];
        if (lastStep) {
          lastStep.observation = block.data;
        }
      }
    }

    return { steps, finalAnswer };
  }

  private splitBlocks(content: string): any[] {
    const blocks: any[] = [];
    const parts = content.split(/\n---\n/);

    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;

      // 检查占位符内容块
      const contentMatch = trimmed.match(/^\$(\S+)\n([\s\S]*)$/);
      if (contentMatch) {
        blocks.push({
          type: 'content',
          contentKey: contentMatch[1],
          content: contentMatch[2],
        });
        continue;
      }

      // 尝试解析 JSON
      try {
        const json = JSON.parse(trimmed);
        if (json.observation !== undefined) {
          blocks.push({ type: 'observation', data: json.observation });
        } else {
          blocks.push({ type: 'step', data: json });
        }
      } catch {
        // 忽略
      }
    }

    return blocks;
  }

  private replacePlaceholders(
    obj: Record<string, any>,
    contentMap: Map<string, string>
  ): Record<string, any> {
    if (!obj) return {};
    
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        const match = value.match(/^\$(\S+)$/);
        result[key] = match ? (contentMap.get(match[1]) || value) : value;
      } else if (typeof value === 'object' && value !== null) {
        result[key] = this.replacePlaceholders(value, contentMap);
      } else {
        result[key] = value;
      }
    }
    return result;
  }

  hasFinalAnswer(steps: ReActStep[]): boolean {
    return steps.some(s => s.final_answer !== undefined);
  }
}

export const reactParser = new ReActParser();
```

---

## 9. Skill 加载器

```typescript
// modules/ai/skills/skills.loader.ts

import * as fs from 'fs';
import * as path from 'path';
import { ToolDefinition } from '../react/react.types';

export interface Skill {
  path: string;
  name: string;
  description: string;
  tools: ToolDefinition[];
}

export class SkillsLoader {
  private skillsDir: string;
  private loadedSkills: Map<string, Skill> = new Map();

  constructor(skillsDir?: string) {
    const home = process.env.HOME || process.env.USERPROFILE;
    this.skillsDir = skillsDir || path.join(home, '.txcode', 'skills');
  }

  async loadAll(): Promise<void> {
    if (!fs.existsSync(this.skillsDir)) return;

    const entries = fs.readdirSync(this.skillsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const mdPath = path.join(this.skillsDir, entry.name, 'skill.md');
        if (fs.existsSync(mdPath)) {
          await this.loadSkill(mdPath);
        }
      } else if (entry.name.endsWith('.md')) {
        await this.loadSkill(path.join(this.skillsDir, entry.name));
      }
    }
  }

  async loadSkill(skillPath: string): Promise<Skill | null> {
    try {
      const content = fs.readFileSync(skillPath, 'utf-8');
      const skill = this.parseSkillMd(content, skillPath);
      this.loadedSkills.set(skill.path, skill);
      return skill;
    } catch (e) {
      console.warn(`Failed to load skill from ${skillPath}:`, e);
      return null;
    }
  }

  private parseSkillMd(content: string, filePath: string): Skill {
    const lines = content.split('\n');
    let name = path.basename(filePath, '.md');
    let description = '';
    const tools: ToolDefinition[] = [];

    let currentTool: Partial<ToolDefinition> | null = null;
    let inTools = false;

    for (const line of lines) {
      // 解析 skill 名称
      const nameMatch = line.match(/^#\s*Skill\s*Name:\s*(.+)/i);
      if (nameMatch) {
        name = nameMatch[1].trim();
        continue;
      }

      // 解析 skill 描述
      const descMatch = line.match(/^##\s*Description\s*$/i);
      if (descMatch) {
        inTools = false;
        continue;
      }

      // 解析工具节
      const toolsMatch = line.match(/^##\s*Tools\s*$/i);
      if (toolsMatch) {
        inTools = true;
        continue;
      }

      // 解析工具定义
      if (inTools) {
        const toolMatch = line.match(/^###\s*(.+)/);
        if (toolMatch) {
          if (currentTool) {
            tools.push(currentTool as ToolDefinition);
          }
          currentTool = {
            name: toolMatch[1].trim(),
            description: '',
            parameters: { type: 'object', properties: {}, required: [] },
          };
          continue;
        }

        // 解析工具描述
        const descLineMatch = line.match(/^\*\*描述\*\*:\s*(.+)/);
        if (descLineMatch && currentTool) {
          currentTool.description = descLineMatch[1].trim();
          continue;
        }

        // 解析参数
        const paramMatch = line.match(/^- `(\w+)`:\s*(\w+)\s*-\s*(.+)/);
        if (paramMatch && currentTool) {
          const [, paramName, paramType, paramDesc] = paramMatch;
          currentTool.parameters!.properties![paramName] = {
            type: paramType,
            description: paramDesc,
          };
          currentTool.parameters!.required!.push(paramName);
        }
      } else {
        // 收集描述
        if (!line.startsWith('#') && !line.startsWith('##')) {
          description += line.trim() + ' ';
        }
      }
    }

    if (currentTool) {
      tools.push(currentTool as ToolDefinition);
    }

    return {
      path: filePath,
      name,
      description: description.trim(),
      tools,
    };
  }

  getAllSkills(): Skill[] {
    return Array.from(this.loadedSkills.values());
  }

  getSkill(path: string): Skill | undefined {
    return this.loadedSkills.get(path);
  }

  getSkillTools(): ToolDefinition[] {
    const tools: ToolDefinition[] = [];
    for (const skill of this.loadedSkills.values()) {
      tools.push(...skill.tools);
    }
    return tools;
  }
}

export const skillsLoader = new SkillsLoader();
```

---

## 10. 内置工具：loadSkill

```typescript
// modules/ai/skills/load-skill.tool.ts

import { skillsLoader, Skill } from './skills.loader';
import { ToolDefinition, ToolResult, ToolContext } from '../react/react.types';

export const loadSkillTool: ToolDefinition = {
  name: 'loadSkill',
  description: '加载一个 Skill MD 文件，获取该文件中的工具定义',
  parameters: {
    type: 'object',
    properties: {
      skillPath: {
        type: 'string',
        description: 'Skill 文件路径，如 skills/my-skill.md'
      }
    },
    required: ['skillPath']
  }
};

export async function loadSkillHandler(
  args: { skillPath: string },
  ctx: ToolContext
): Promise<ToolResult> {
  try {
    const fullPath = ctx.projectPath 
      ? `${ctx.projectPath}/${args.skillPath}`
      : args.skillPath;
    
    const skill = await skillsLoader.loadSkill(fullPath);
    
    if (!skill) {
      return { success: false, error: `Failed to load skill: ${args.skillPath}` };
    }

    return {
      success: true,
      data: {
        name: skill.name,
        description: skill.description,
        tools: skill.tools.map(t => ({
          name: t.name,
          description: t.description,
        })),
      },
    };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
```

---

## 11. ReAct Agent 实现

```typescript
// modules/ai/react/react.agent.ts

import { aiProvider } from '../ai.provider';
import { reactParser } from './react.parser';
import { buildReActPrompt } from './react.prompts';
import { ReActStep, ReActResult, ToolDefinition } from './react.types';
import { toolsManager, ToolResult } from '../tools/tools.manager';
import { skillsLoader, loadSkillTool, loadSkillHandler } from '../skills/skills.loader';
import { ChatMessage } from '../ai.types';
import { memoryRepository } from '../../memory/memory.repository';
import { configService } from '../../config/config.service';

export class ReActAgent {
  private maxIterations: number;
  private builtinTools: ToolDefinition[] = [];

  constructor() {
    this.maxIterations = configService.get<number>('ai.maxToolIterations') || 10;
    this.initTools();
  }

  private initTools() {
    this.builtinTools = toolsManager.getBuiltinTools();
    this.builtinTools.push(loadSkillTool);
    toolsManager.registerBuiltinTool(loadSkillTool, loadSkillHandler);
    skillsLoader.loadAll();
  }

  async run(
    userMessage: string,
    context: { projectPath: string; sessionId: string },
    onStep?: (step: ReActStep) => void
  ): Promise<ReActResult> {
    const steps: ReActStep[] = [];
    const historyMessages: ChatMessage[] = [];
    
    // 获取永久记忆
    const permanentMessages = memoryRepository.getPermanentMessages(context.sessionId);
    for (const msg of permanentMessages) {
      historyMessages.push({ role: msg.role, content: msg.content });
    }
    
    const skills = skillsLoader.getAllSkills();
    const systemPrompt = buildReActPrompt(this.builtinTools, skills, this.maxIterations);
    historyMessages.push({ role: 'system', content: systemPrompt });
    
    // 添加用户消息
    historyMessages.push({ role: 'user', content: userMessage });
    
    // 保存用户消息为永久记忆
    memoryRepository.addMessage(context.sessionId, 'user', userMessage, true);

    let iteration = 0;

    while (iteration < this.maxIterations) {
      iteration++;
      
      const response = await aiProvider.chat(historyMessages);
      const aiContent = response.content;

      const { steps: newSteps, finalAnswer } = reactParser.parse(aiContent);
      
      if (newSteps.length > steps.length) {
        const latestStep = newSteps[newSteps.length - 1];
        
        if (finalAnswer && !latestStep.action) {
          steps.push(latestStep);
          // 保存 AI 回复为永久记忆
          memoryRepository.addMessage(context.sessionId, 'assistant', finalAnswer, true);
          break;
        }
        
        if (latestStep.action && latestStep.action !== 'final_answer') {
          const toolResult = await this.executeTool(latestStep.action, latestStep.actionInput, context);
          
          latestStep.observation = toolResult.success ? toolResult.data : { error: toolResult.error };
          steps.push(latestStep);
          onStep?.(latestStep);

          // 根据 remember 字段决定是否永久记忆
          const isPermanent = latestStep.remember === true;
          memoryRepository.addMessage(
            context.sessionId, 
            'tool', 
            JSON.stringify(latestStep.observation), 
            isPermanent
          );

          if (latestStep.action === 'loadSkill') {
            await skillsLoader.loadAll();
          }
        }
      }

      if (reactParser.hasFinalAnswer(steps)) break;
      
      // 将 AI 回复加入历史
      historyMessages.push({ role: 'assistant', content: aiContent });
    }

    const lastStep = steps[steps.length - 1];
    
    // 检查是否需要会话压缩
    this.checkCompression(context.sessionId);

    return {
      answer: finalAnswer || lastStep?.observation?.error || '无法完成任务',
      steps,
      iterations: iteration,
      success: iteration < this.maxIterations,
      error: iteration >= this.maxIterations ? '达到最大迭代次数' : undefined,
    };
  }

  private async executeTool(
    toolName: string,
    args: Record<string, any>,
    context: { projectPath: string; sessionId: string }
  ): Promise<ToolResult> {
    return toolsManager.execute(toolName, args, {
      projectPath: context.projectPath,
      sessionId: context.sessionId,
    });
  }

  private checkCompression(sessionId: string) {
    const maxCompression = configService.get<number>('ai.maxSessionCompression') || 5;
    memoryRepository.compressSession(sessionId, maxCompression);
  }
}

export const reactAgent = new ReActAgent();
```

---

## 12. 完整交互示例

### 12.1 Skill MD 文件示例

```markdown
# Skill: react-helper

## Description
用于创建 React 组件的 Skill

## Tools

### createComponent
**描述**: 创建一个 React 组件文件
**参数**:
- `path`: string - 组件文件路径
- `content`: string - 组件内容

### createPage
**描述**: 创建一个页面组件
**参数**:
- `path`: string - 页面文件路径
- `content`: string - 页面内容
```

### 12.2 交互流程

**Round 1:**
```json
{
  "thought": "用户需要创建 React 组件，使用 react-helper Skill",
  "action": "loadSkill",
  "action_input": {
    "skillPath": "skills/react-helper.md"
  },
  "remember": true
}
```

**执行结果:**
```json
{
  "observation": {
    "name": "react-helper",
    "tools": [{"name": "createComponent", "description": "..."}]
  }
}
```

**Round 2:**
```json
{
  "thought": "Skill 已加载，现在创建组件",
  "action": "createComponent",
  "action_input": {
    "path": "src/components/User.tsx",
    "content": "$content:1"
  },
  "remember": true
}
```
$content:1
import React from 'react';

export const User: React.FC = () => {
  return <div>User</div>;
};
```

**执行结果:**
```json
{"observation": {"success": true}}
```

**Round 3:**
```json
{
  "thought": "组件已创建完成",
  "final_answer": "已成功创建 src/components/User.tsx"
}
```

---

## 13. 记忆流程图

```
┌─────────────────────────────────────────────────────────────┐
│                    记忆管理流程                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. 用户输入                                                │
│     → 添加到 messages (is_permanent=1)                      │
│                                                              │
│  2. AI 思考并决定调用工具                                    │
│     → 执行工具                                              │
│                                                              │
│  3. 工具结果返回                                             │
│     → AI 判断是否重要                                        │
│       ├── remember=true → 永久记忆 (is_permanent=1)        │
│       └── remember=false → 临时记忆 (is_permanent=0)       │
│                                                              │
│  4. 下一轮对话                                              │
│     → 只加载永久记忆 (is_permanent=1)                       │
│     → 临时记忆被忽略                                        │
│                                                              │
│  5. 会话压缩                                                │
│     → 当永久消息数 > maxSessionCompression                  │
│     → 保留最近 5 条，删除更早的                            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 14. 技术栈

- **SDK**: OpenAI SDK (官方)
- **格式**: JSON + `$placeholder` 占位符
- **交互模式**: ReAct
- **最大迭代**: 可配置 (默认 10)
- **会话压缩**: 可配置 (默认保留 5 条)
