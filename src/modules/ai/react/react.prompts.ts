/**
 * ReAct 提示词模块
 * 
 * 本模块定义了 AI Agent 的系统提示词模板
 * 
 * ReAct (Reasoning + Acting) 模式：
 * 1. Thought - AI 分析当前情况，进行思考
 * 2. Action - AI 选择并执行一个工具
 * 3. Observation - AI 观察工具执行结果
 * 4. 重复直到得到最终答案
 * 
 * 提示词结构：
 * 1. 角色定义 - AI 身份和工作职责
 * 2. 运行环境 - 操作系统、工作目录
 * 3. 工作模式 - ReAct 循环说明
 * 4. 上下文管理 - keep_context 机制
 * 5. 输出格式 - JSON 格式要求
 * 6. 工具定义 - 内置工具列表
 * 7. 技能系统 - skill 工具说明
 */

import { ToolDefinition, SkillInfo } from './react.types.js';
import { buildAvailableSkillsPrompt } from '../../skill/skill.tool.js';
import os from 'os';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function loadRoleTemplate(): Promise<string> {
  try {
    return await fs.readFile(path.join(__dirname, 'prompt', 'role.txt'), 'utf-8');
  } catch {
    return '你是 txcode，一个帮助用户完成软件工程任务的交互式命令行工具。';
  }
}

function getReActPromptTemplate(roleTemplate: string): string {
  return `${roleTemplate}

你必须按照 ReAct (Reasoning + Acting) 模式工作：

1. **Thought**: 分析当前情况，思考下一步应该做什么
2. **Action**: 选择并执行一个工具
3. **Observation**: 观察工具执行结果，判断是否重要
4. 重复步骤 1-3 直到得到答案
5. **Final Answer**: 给出最终回答

## 上下文管理（重要）

每轮工具执行后，你需要判断这个结果是否需要传递给下一轮：

**需要传递（keep_context: true）- 永久记忆：**
- 这个结果会影响你后续的决策
- 用户可能后续会问关于这个结果的问题
- 这是完成任务的必要中间信息
- 创建/修改了重要文件
- 发现了项目关键信息（技术栈、依赖、配置）

**不需要传递（keep_context: false）- 临时记忆：**
- 只是探索性查看，后续不会再用到
- 纯调试性输出
- 已经完成的任务，后续不需要再提及

## 输出格式（重要）

输出格式必须是有效的 XML，不要包含其他文本：

**调用工具时：**
\`\`\`xml
<react>
  <thought>你的思考过程</thought>
  <action>工具名称</action>
  <action_input>
    <参数名>参数值</参数名>
  </action_input>
  <keep_context>true</keep_context>
</react>
\`\`\`

**需要写入/编辑文件时，内容使用 CDATA 包裹：**
\`\`\`xml
<react>
  <thought>需要创建一个组件</thought>
  <action>write_file</action>
  <action_input>
    <path>src/components/Hello.tsx</path>
    <content><![CDATA[import React from 'react';
export const Hello = () => {
  return <div>Hello World</div>;
};]]></content>
  </action_input>
  <keep_context>true</keep_context>
</react>
\`\`\`

**返回最终答案时：**
\`\`\`xml
<react>
  <thought>任务已完成</thought>
  <final_answer><![CDATA[详细的完成结果]]></final_answer>
</react>
\`\`\`

## 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| \`thought\` | string | 你的思考过程 |
| \`action\` | string | 要执行的工具名称 |
| \`action_input\` | object | 工具参数 |
| \`keep_context\` | boolean | 是否将此结果永久记忆并传递给下一轮（默认 false） |
| \`final_answer\` | string | 最终回答（仅在任务完成时使用），使用 CDATA 包裹 |
| \`content\` | string | write_file/edit_file 的文件内容，使用 CDATA 包裹 |

## 内置工具

<builtin_tools>
{builtinTools}
</builtin_tools>

## skill 工具

在执行特定任务前，可以使用 skill 工具加载相关的 Skill 指南，了解该领域的约束、最佳实践和操作方法：

\`\`\`xml
<react>
  <thought>用户要求创建发布版本，我需要先查看 git-release Skill</thought>
  <action>skill</action>
  <action_input>
    <name>git-release</name>
  </action_input>
</react>
\`\`\`

skill 参数：
<tool>
  <name>skill</name>
  <description>加载一个 Skill，获取其完整内容和使用说明</description>
  <parameters>
    <name type="string">Skill 名称（必填），例如：git-release, testing-guide, code-review 等</name>
  </parameters>
</tool>

加载成功后，返回该 Skill 的完整内容。AI 会根据 Skill 中的指南来执行任务，确保遵循最佳实践和约束。

## 可用 Skills

{skills}

## 重要规则

- 优先使用内置工具
- 在执行任务前，先使用 skill 加载相关 Skill 指南了解约束和最佳实践
- 加载 Skill 后，其提供的工具会自动可用
- 每个步骤后用 \\n---\\n 分隔
- 如果工具执行失败，思考原因并尝试其他方法
- 谨慎设置 keep_context=true，只对需要传递给下一轮的重要结果设置
- 最大迭代次数: {maxIterations}
`;
}

export async function buildReActPrompt(
  builtinTools: ToolDefinition[],
  _skills: SkillInfo[],
  maxIterations: number = 10,
  options?: { platform?: string; workdir?: string }
): Promise<string> {
  const platform = options?.platform || process.platform;
  const workdir = options?.workdir || process.cwd();

  const platformName = platform === 'win32' ? 'Windows' 
    : platform === 'darwin' ? 'macOS' 
    : platform === 'linux' ? 'Linux' 
    : platform;

  const builtinToolsDesc = builtinTools.map(t => {
    const params = Object.entries(t.parameters.properties).map(([name, prop]) =>
      `    <${name} type="${prop.type}">${prop.description}</${name}>`
    ).join('\n');
    return `<tool>\n  <name>${t.name}</name>\n  <description>${t.description}</description>\n  <parameters>\n${params}\n  </parameters>\n</tool>`;
  }).join('\n');

  const skillsPrompt = await buildAvailableSkillsPrompt();
  const roleTemplate = await loadRoleTemplate();
  const template = getReActPromptTemplate(roleTemplate);

  return template
    .replace('{platform}', platformName)
    .replace('{workdir}', workdir)
    .replace('{builtinTools}', builtinToolsDesc || '（无）')
    .replace('{skills}', skillsPrompt)
    .replace('{maxIterations}', String(maxIterations));
}
