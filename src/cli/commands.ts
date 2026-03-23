/**
 * CLI 命令处理
 */

import { sessionService } from '../modules/session/index.js';
import { configService } from '../modules/config/index.js';
import { skillsManager } from '../modules/skill/index.js';
import { memoryService } from '../modules/memory/index.js';
import { CommandResult } from './cli.types.js';

export type CommandHandler = (args: string[]) => CommandResult | Promise<CommandResult>;

const commands: Map<string, CommandHandler> = new Map();

/**
 * 注册命令
 */
export function registerCommand(name: string, handler: CommandHandler): void {
  commands.set(name, handler);
}

/**
 * 执行命令
 */
export async function executeCommand(input: string): Promise<CommandResult> {
  const parts = input.trim().split(/\s+/);
  const command = parts[0]?.toLowerCase();
  const args = parts.slice(1);

  if (!command || !command.startsWith('/')) {
    return { success: false, message: '未知命令。使用 /help 查看可用命令。' };
  }

  const handler = commands.get(command.slice(1));
  
  if (!handler) {
    return { success: false, message: `未知命令: ${command}。使用 /help 查看可用命令。` };
  }

  try {
    return await handler(args);
  } catch (error) {
    return {
      success: false,
      message: `命令执行错误: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * 获取所有命令
 */
export function getAllCommands(): string[] {
  return Array.from(commands.keys());
}

// 注册内置命令

registerCommand('help', () => ({
  success: true,
  message: `
可用命令:
  /help          - 显示帮助信息
  /new [title]   - 创建新会话
  /sessions      - 列出所有会话
  /switch <id>   - 切换到指定会话
  /delete <id>   - 删除指定会话
  /skills        - 列出所有技能
  /use <skill>   - 使用指定技能
  /providers     - 列出所有服务商
  /models        - 列出所有模型
  /model <id>    - 切换模型
  /token         - 查看 Token 统计
  /config <k=v>  - 设置配置项
  /clear         - 清除当前会话
  /exit          - 退出程序
`,
}));

registerCommand('new', (args) => {
  const title = args.join(' ') || '新会话';
  const session = sessionService.create(title);
  sessionService.switchTo(session.id);
  return { success: true, message: `已创建并切换到会话: ${session.id}`, data: session };
});

registerCommand('sessions', () => {
  const sessions = sessionService.getAll();
  const current = sessionService.getCurrentId();
  
  const list = sessions
    .map(s => `${s.id === current ? '* ' : '  '}${s.id.slice(0, 8)} - ${s.title}`)
    .join('\n');
  
  return { success: true, message: `会话列表:\n${list}`, data: sessions };
});

registerCommand('switch', (args) => {
  const id = args[0];
  if (!id) {
    return { success: false, message: '请提供会话 ID' };
  }
  
  const session = sessionService.switchTo(id);
  if (!session) {
    return { success: false, message: `会话不存在: ${id}` };
  }
  
  return { success: true, message: `已切换到会话: ${session.title}`, data: session };
});

registerCommand('delete', (args) => {
  const id = args[0];
  if (!id) {
    return { success: false, message: '请提供会话 ID' };
  }
  
  sessionService.delete(id);
  return { success: true, message: `已删除会话: ${id}` };
});

registerCommand('skills', async () => {
  await skillsManager.loadAll();
  const skills = skillsManager.getAvailableSkills();
  const list = skills.map((s: { name: string; description: string }) => `  ${s.name} - ${s.description}`).join('\n');
  return { success: true, message: `可用技能:\n${list}`, data: skills };
});

registerCommand('use', async (args) => {
  const skillName = args[0];
  if (!skillName) {
    return { success: false, message: '请提供技能名称' };
  }

  await skillsManager.loadAll();
  const skill = skillsManager.getSkill(skillName);
  if (!skill) {
    return { success: false, message: `技能不存在: ${skillName}` };
  }

  return { success: true, message: `已激活技能: ${skill.name}\n${skill.rawContent}`, data: skill };
});

registerCommand('providers', () => {
  const providers = configService.getProviders();
  const list = providers
    .map(p => `${p.isDefault ? '* ' : '  '}${p.name} (${p.id})`)
    .join('\n');
  return { success: true, message: `服务商列表:\n${list}`, data: providers };
});

registerCommand('models', () => {
  const providers = configService.getProviders();
  const allModels: { providerId: string; providerName: string; models: any[] }[] = [];
  
  for (const provider of providers) {
    const models = configService.getModels(provider.id);
    if (models.length > 0) {
      allModels.push({
        providerId: provider.id,
        providerName: provider.name,
        models,
      });
    }
  }
  
  if (allModels.length === 0) {
    return { success: true, message: '暂无可用模型，请先配置服务商和模型', data: [] };
  }
  
  const list = allModels.map(p => {
    const modelList = p.models.map(m => `    ${m.name} (${m.id})`).join('\n');
    return `[${p.providerName}]\n${modelList}`;
  }).join('\n');
  
  return { success: true, message: `可用模型:\n${list}`, data: allModels };
});

let currentModelId: string | null = null;

registerCommand('model', (args) => {
  const modelId = args[0];
  
  if (!modelId) {
    return { success: false, message: '请提供模型 ID，或使用 /models 查看可用模型' };
  }
  
  const allModels = configService.getAllModels();
  const model = allModels.find(m => m.id === modelId);
  
  if (!model) {
    return { success: false, message: `模型不存在: ${modelId}` };
  }
  
  currentModelId = modelId;
  return { success: true, message: `已切换到模型: ${model.name}`, data: { modelId } };
});

export function getCurrentModelId(): string | null {
  return currentModelId;
}

let tokenStats = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

export function getTokenStats() {
  return tokenStats;
}

export function resetTokenStats() {
  tokenStats = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
}

export function updateTokenStats(usage: { promptTokens: number; completionTokens: number; totalTokens: number }) {
  tokenStats.promptTokens += usage.promptTokens;
  tokenStats.completionTokens += usage.completionTokens;
  tokenStats.totalTokens += usage.totalTokens;
}

registerCommand('token', () => {
  const current = sessionService.getCurrentId();
  if (!current) {
    return { success: true, message: `Token 统计:\n  Prompt: ${tokenStats.promptTokens}\n  Completion: ${tokenStats.completionTokens}\n  Total: ${tokenStats.totalTokens}`, data: tokenStats };
  }
  const stats = memoryService.getSessionStats(current);
  const compressPercent = stats.totalMessages > 0 ? Math.round((stats.compressedCount / stats.totalMessages) * 100) : 0;
  return {
    success: true,
    message: `会话 Token 统计:\n  Prompt: ${tokenStats.promptTokens}\n  Completion: ${tokenStats.completionTokens}\n  Total: ${tokenStats.totalTokens}\n会话消息: ${stats.totalMessages} (压缩 ${compressPercent}%)`,
    data: { ...tokenStats, sessionStats: stats }
  };
});

registerCommand('config', (args) => {
  const [keyValue] = args;
  
  if (!keyValue) {
    return { success: false, message: '用法: /config key=value' };
  }
  
  const [key, value] = keyValue.split('=');
  
  if (!key || value === undefined) {
    return { success: false, message: '用法: /config key=value' };
  }
  
  configService.set(key, value);
  return { success: true, message: `已设置 ${key} = ${value}` };
});

registerCommand('clear', () => {
  sessionService.clearCurrent();
  return { success: true, message: '已清除当前会话' };
});

registerCommand('exit', () => {
  return { success: true, message: '退出程序...', data: { exit: true } };
});