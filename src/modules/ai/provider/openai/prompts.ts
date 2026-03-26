import { openaiTools } from '../../../tools/provider/openai/tools.js';
import { buildAvailableSkillsPrompt } from '../../../skill/skill.tool.js';

function getProviderPromptTemplate(roleTemplate: string): string {
  return `${roleTemplate}

 你通过 OpenAI Function Calling 模式工作：

 1. AI 生成结构化的工具调用请求
 2. 系统自动执行工具并返回结果
 3. 重复直到任务完成

 ## 上下文管理

 Provider 模式下，所有工具执行结果默认都会保留在对话历史中供后续参考。

 ## 内置工具

 {builtinTools}

 ## 可用 Skills

 {skills}

 ## 重要规则

 - 优先使用内置工具
 - 在执行任务前，先使用 skill 加载相关 Skill 指南了解约束和最佳实践
 - 如果工具执行失败，思考原因并尝试其他方法
 - 最大迭代次数: {maxIterations}
 `;
}

export async function buildProviderPrompt(
  _builtinTools: any[] = [],
  _skills: SkillInfo[] = [],
  maxIterations: number = 10,
  options?: { platform?: string; workdir?: string }
): Promise<string> {
  const platform = options?.platform || process.platform;
  const workdir = options?.workdir || process.cwd();

  const platformName = platform === 'win32' ? 'Windows'
    : platform === 'darwin' ? 'macOS'
    : platform === 'linux' ? 'Linux'
    : platform;

  const builtinToolsDesc = openaiTools.map(t => `- **${t.function.name}**: ${t.function.description}`).join('\n');

  const skillsPrompt = await buildAvailableSkillsPrompt();
  const roleTemplate = await loadRoleTemplate();
  const template = getProviderPromptTemplate(roleTemplate);

  return template
    .replace('{platform}', platformName)
    .replace('{workdir}', workdir)
    .replace('{builtinTools}', builtinToolsDesc || '（无）')
    .replace('{skills}', skillsPrompt)
    .replace('{maxIterations}', String(maxIterations));
}

async function loadRoleTemplate(): Promise<string> {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    return await fs.readFile(path.join(__dirname, 'prompt', 'role.txt'), 'utf-8');
  } catch {
    return '你是 txcode，一个帮助用户完成软件工程任务的交互式命令行工具。';
  }
}

interface SkillInfo {
  path: string;
  name: string;
  description: string;
}
