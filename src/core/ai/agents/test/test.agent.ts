import { ChatMessage, BaseProvider, MultimodalContent } from '../../ai.types.js';
import { createIterationSignal } from '../../helpers/abort.helper.js';
import { TEST_TOOLS } from './agent_tool.js';
import { AgentToolRegistry, buildToolContext } from '../agent.tool.js';
import {
  AIProvider,
  ProviderRunOptions,
  ProviderRunResult,
  ProviderStep,
  ProviderToolResult,
  ProviderTokenUsage,
} from '../../provider/base.js';
import type { MemoryService } from '../../../../services/memory/memory.service.js';
import { buildAvailableSkillsPrompt } from '../../../../services/skill/skill.tool.js';
import { loadMemory } from '../../../tools/provider/memory.js';
import { loadProjectContext } from '../../../context/project.context.js';
import { playwrightManager } from '../../../../services/test/playwrightManager.js';

async function loadRoleTemplate(): Promise<string> {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    return await fs.readFile(path.join(__dirname, 'prompts', 'role.txt'), 'utf-8');
  } catch {
    return '你是 txcode 测试助手，负责通过 Playwright 浏览器自动化执行测试任务。';
  }
}

export interface TestAgentConfig {
  provider: BaseProvider;
  maxIterations?: number;
  projectPath?: string;
  sessionId?: string;
  memoryService?: MemoryService;
  webContentsId?: number;
}

export class TestAgent implements AIProvider {
  name = 'test';
  tools = TEST_TOOLS;
  keepContext = true;

  private provider: BaseProvider;
  private maxIterations: number;
  private projectPath?: string;
  private sessionId?: string;
  private memoryService?: MemoryService;
  private webContentsId?: number;
  private toolRegistry: AgentToolRegistry;

  constructor(config: TestAgentConfig) {
    this.provider = config.provider;
    this.maxIterations = config.maxIterations || 50;
    this.projectPath = config.projectPath;
    this.sessionId = config.sessionId;
    this.memoryService = config.memoryService;
    this.webContentsId = config.webContentsId;
    this.toolRegistry = new AgentToolRegistry(TEST_TOOLS);
  }

  async run(
    userMessage: string,
    options?: ProviderRunOptions
  ): Promise<ProviderRunResult> {
    const builtinTools = await this.toolRegistry.getDefinitions();
    const steps: ProviderStep[] = [];
    const baseMessages: ChatMessage[] = [];
    const abortSignal = options?.abortSignal;
    const systemPrompt = await this.buildPrompt(builtinTools);

    if (this.sessionId && this.webContentsId) {
      playwrightManager.registerSession(this.sessionId, this.webContentsId);
    }

    if (options?.historyMessages && options.historyMessages.length > 0) {
      for (const msg of options.historyMessages) {
        if (msg.role !== 'system') {
          baseMessages.push(msg);
        }
      }
    }

    this.pushUserMessage(baseMessages, userMessage, options?.mediaFiles);
    this.addMessage('user', userMessage, true, true, undefined, undefined, this.sessionId, options?.mediaFiles);

    let iteration = 0;
    let finalAnswer = '';
    let totalUsage: ProviderTokenUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

    while (iteration < this.maxIterations) {
      if (abortSignal?.aborted) {
        throw new Error('ABORTED');
      }

      iteration++;

      const messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        ...baseMessages,
      ];

      const { signal: iterSignal, cleanup } = createIterationSignal(abortSignal);
      const response = await this.provider.chat(messages, {
        tools: builtinTools,
        abortSignal: iterSignal,
        sessionId: this.sessionId,
        modelName: this.provider.getModel(),
      }).finally(() => cleanup());

      if (abortSignal?.aborted) {
        throw new Error('ABORTED');
      }

      if (response.usage) {
        totalUsage.promptTokens += response.usage.promptTokens;
        totalUsage.completionTokens += response.usage.completionTokens;
        totalUsage.totalTokens += response.usage.totalTokens;
      }

      if (response.finishReason === 'stop' && response.content) {
        finalAnswer = response.content;
        this.addMessage('assistant', finalAnswer, true, false, undefined, undefined, options?.sessionId);
        break;
      }

      if (response.finishReason === 'tool_calls' && response.toolCalls && response.toolCalls.length > 0) {
        const toolCalls = AgentToolRegistry.parseToolCalls(response.toolCalls);

        const results: ProviderToolResult[] = [];
        const toolContext = buildToolContext({ sessionId: this.sessionId || options?.sessionId || '', projectPath: this.projectPath });

        for (const toolCall of toolCalls) {
          const result = await this.toolRegistry.execute(toolCall.name, toolCall.arguments, toolContext);
          results.push({
            name: toolCall.name,
            success: result.success,
            output: result.data,
            error: result.error,
            metadata: result.metadata,
          });
        }

        const step: ProviderStep = {
          reasoning: response.reasoning,
          toolCalls,
          results,
        };

        steps.push(step);
        options?.onStep?.(step, iteration, response.usage);

        for (let i = 0; i < toolCalls.length; i++) {
          const toolCall = toolCalls[i];
          const result = results[i];

          const assistantMsg = {
            role: 'assistant' as const,
            content: null as any,
            toolCalls: [{
              id: toolCall.id,
              type: 'function' as const,
              function: {
                name: toolCall.name,
                arguments: JSON.stringify(toolCall.arguments),
              },
            }],
          };
          baseMessages.push(assistantMsg);
          const reactData = {
            type: 'assistant_with_tools',
            toolCalls: assistantMsg.toolCalls,
            thought: response.reasoning || '',
            success: result.success,
          };
          this.addMessage('assistant', JSON.stringify(reactData), true, false, undefined, undefined, options?.sessionId);

          const toolMsg = {
            role: 'tool' as const,
            content: result.success ? result.output || '' : `Error: ${result.error}`,
            toolCallId: toolCall.id,
          };
          baseMessages.push(toolMsg);
          this.addMessage('tool', toolMsg.content, true, false, undefined, toolCall.id, options?.sessionId);
        }

        continue;
      }

      if (response.content) {
        finalAnswer = response.content;
        break;
      }

      break;
    }

    const success = iteration < this.maxIterations && finalAnswer.length > 0;

    return {
      answer: finalAnswer || steps[steps.length - 1]?.results?.[0]?.output || 'Unable to complete test',
      steps,
      iterations: iteration,
      success,
      error: iteration >= this.maxIterations ? 'Max iterations reached' : undefined,
      usage: totalUsage,
    };
  }

  getType(): string {
    return 'test';
  }

  private async buildPrompt(_builtinTools: any[] = []): Promise<string> {
    const platform = process.platform;
    const workdir = this.projectPath || process.cwd();

    const platformName = platform === 'win32' ? 'Windows'
      : platform === 'darwin' ? 'macOS'
      : platform === 'linux' ? 'Linux'
      : platform;

    const roleTemplate = await loadRoleTemplate();
    const skillsPrompt = await buildAvailableSkillsPrompt();

    const memory = loadMemory(workdir);
    let memoryBlock = '';
    if (memory) {
      memoryBlock = `\n<memory-context>\n${memory}\n</memory-context>`;
    }

    const projectContext = loadProjectContext(workdir);
    let projectBlock = '';
    if (projectContext) {
      projectBlock = `\n<project-context>\n${projectContext}\n</project-context>`;
    }

    return `${roleTemplate}${projectBlock}${memoryBlock}

你是一个浏览器自动化测试助手。你可以通过 Playwright API 直接操控一个已经打开的浏览器窗口来执行测试任务。

## 工作原则

1. 分析用户需求的测试步骤
2. 使用 test_get_content 获取页面 DOM 结构，分析元素选择器
3. 使用 test_navigate、test_click、test_type 等工具执行操作
4. 每步操作后使用 test_screenshot 截图记录
5. 使用 test_assert_element、test_assert_text 验证结果
6. 在操作过程中适当使用 test_wait 等待页面加载或元素出现

## 测试工具

- test_navigate(url) - 导航到指定页面
- test_click(selector) - 点击元素
- test_type(selector, text) - 输入文本
- test_screenshot() - 截图（返回 base64）
- test_hover(selector) - 悬停元素
- test_select(selector, value) - 下拉选择
- test_wait(target) - 等待（毫秒数或选择器）
- test_get_content() - 获取页面 DOM（最多 50000 字符）
- test_assert_element(selector) - 断言元素存在
- test_assert_text(text) - 断言文本存在
- test_get_url() - 获取当前页面 URL 和标题

## 可用 Skills

{skills}

## 运行环境
- 操作系统: ${platformName}
- 工作目录: ${workdir}
`.replace('{skills}', skillsPrompt);
  }

  private addMessage(
    role: 'user' | 'assistant' | 'system' | 'tool',
    content: string,
    keepContext: boolean,
    isOriginal: boolean = false,
    toolCalls?: any[],
    toolCallId?: string,
    sessionId?: string,
    mediaFiles?: { filePath: string; type: string; dataUrl?: string }[]
  ): void {
    if (!sessionId || !this.memoryService) return;

    let savedContent = content;
    if (role === 'assistant' && toolCalls && toolCalls.length > 0) {
      savedContent = JSON.stringify({ type: 'assistant_with_tools', toolCalls });
    } else if (role === 'tool' && toolCallId) {
      savedContent = JSON.stringify({ type: 'tool_result', toolCallId, output: content });
    }

    this.memoryService.addMessage(sessionId, role, savedContent, keepContext, isOriginal,
      role === 'user' && mediaFiles ? mediaFiles.map(mf => ({ filePath: mf.filePath, type: mf.type })) : undefined
    );
  }

  private pushUserMessage(
    baseMessages: ChatMessage[],
    userMessage: string,
    mediaFiles?: { filePath: string; type: string; dataUrl?: string }[]
  ): void {
    if (mediaFiles && mediaFiles.length > 0) {
      const content: MultimodalContent[] = [
        { type: 'text', text: userMessage },
      ];
      for (const mf of mediaFiles) {
        content.push({
          type: 'image_url',
          image_url: { url: mf.filePath },
        });
      }
      baseMessages.push({ role: 'user', content });
    } else {
      baseMessages.push({ role: 'user', content: userMessage });
    }
  }
}
