import { OpenAIProvider } from './openai.provider.js';
import { ChatMessage } from './ai.types.js';
import { ToolService } from '../tools/tool.service.js';
import { SkillsManager } from '../skill/skills.manager.js';
import { MemoryService } from '../memory/memory.service.js';
import { SessionService, sessionService as defaultSessionService } from '../session/session.service.js';
import { reactParser } from './react/react.parser.js';
import { buildReActPrompt } from './react/react.prompts.js';
import { ReActStep, ReActResult, ToolDefinition, SkillInfo } from './react/react.types.js';

/**
 * ReAct Agent 配置文件
 */
export interface ReActAgentConfig {
  provider: OpenAIProvider;
  toolService: ToolService;
  skillsManager?: SkillsManager;
  memoryService?: MemoryService;
  maxIterations?: number;
  projectPath?: string;
  sessionId?: string;
}

/**
 * ReAct Agent 运行选项
 */
export interface ReActRunOptions {
  onStep?: (step: ReActStep, iteration: number, usage?: { promptTokens: number; completionTokens: number; totalTokens: number }) => void;
  historyMessages?: ChatMessage[];
}

/**
 * ReAct Agent - 基于 ReAct (Reasoning + Acting) 模式的 AI Agent
 * 通过循环推理和执行工具来完成复杂任务
 */
export class ReActAgent {
  private provider: OpenAIProvider;
  private toolService: ToolService;
  private skillsManager?: SkillsManager;
  private memoryService?: MemoryService;
  private sessionService: SessionService;
  private maxIterations: number;
  private projectPath?: string;
  private sessionId?: string;

  /**
   * 构造函数
   * @param config ReAct Agent 配置
   */
  constructor(config: ReActAgentConfig) {
    this.provider = config.provider;
    this.toolService = config.toolService;
    this.skillsManager = config.skillsManager;
    this.memoryService = config.memoryService;
    this.sessionService = defaultSessionService;
    this.maxIterations = config.maxIterations || 50;
    this.projectPath = config.projectPath;
    this.sessionId = config.sessionId;
  }

  /**
   * 运行 ReAct Agent
   * @param userMessage 用户消息
   * @param options 运行选项
   * @returns ReAct 执行结果
   */
  async run(
    userMessage: string,
    options?: ReActRunOptions
  ): Promise<ReActResult> {
    const steps: ReActStep[] = [];
    const baseMessages: ChatMessage[] = [];

    // 获取可用的技能和工具，构建系统提示词
    const skills = await this.getAvailableSkills();
    const builtinTools = await this.getBuiltinTools();
    const systemPrompt = await buildReActPrompt(builtinTools, skills, this.maxIterations);

    // 添加历史消息（排除系统消息）
    if (options?.historyMessages && options.historyMessages.length > 0) {
      for (const msg of options.historyMessages) {
        if (msg.role !== 'system') {
          baseMessages.push(msg);
        }
      }
    }

    baseMessages.push({ role: 'user', content: userMessage });

    // 添加用户消息到内存
    this.addMessage('user', userMessage, true, true);

    let iteration = 0;
    let finalAnswer = '';
    let totalUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

    // ReAct 循环：推理 -> 行动 -> 观察
    while (iteration < this.maxIterations) {
      iteration++;

      const messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        ...baseMessages
      ];

      // 调用 AI 模型获取响应
      const response = await this.provider.chat(messages);
      
      // 累加 token 使用量
      if (response.usage) {
        totalUsage.promptTokens += response.usage.promptTokens;
        totalUsage.completionTokens += response.usage.completionTokens;
        totalUsage.totalTokens += response.usage.totalTokens;
      }

      const aiContent = response.content || '';

      let parsed: Awaited<ReturnType<typeof reactParser.parse>>;
      
      try {
        // 解析 AI 响应
        parsed = await reactParser.parse(aiContent);
      } catch (parseError: any) {
        // 解析失败，返回错误信息给 AI
        const errorMessage = `Tool Result:\n---\n${parseError.message}\n---\nPlease return a valid XML response in the correct format.`;
        
        this.addMessage('assistant', aiContent, true);
        this.addMessage('user', errorMessage, false);
        
        baseMessages.push({ role: 'assistant', content: aiContent });
        baseMessages.push({ role: 'user', content: errorMessage });
        
        continue;
      }
      
      // 无解析结果，直接返回内容
      if (parsed.steps.length === 0) {
        finalAnswer = aiContent;
        this.addMessage('assistant', finalAnswer, true);
        break;
      }

      const latestStep = parsed.steps[parsed.steps.length - 1];

      // 检查是否是最终答案
      if (latestStep.final_answer) {
        finalAnswer = latestStep.final_answer;
        steps.push(latestStep);
        this.addMessage('assistant', finalAnswer, true);
        break;
      }

      // 执行工具调用
      if (latestStep.actions && latestStep.actions.length > 0) {
        const toolResults: { actionName: string; result: any }[] = [];
        
        for (const action of latestStep.actions) {
          const toolResult = await this.executeTool(
            action.actionName,
            action.actionInput
          );
          
          toolResults.push({
            actionName: action.actionName,
            result: toolResult.success 
              ? toolResult.data 
              : { error: toolResult.error },
          });

          // 加载技能
          if (action.actionName === 'loadSkill' && this.skillsManager) {
            await this.skillsManager.loadAll();
          }
        }

        // 记录观察结果
        latestStep.observation = toolResults.length === 1 
          ? toolResults[0].result 
          : toolResults;
        
        steps.push(latestStep);
        options?.onStep?.(latestStep, iteration, response.usage);

        // 格式化工具结果并添加到消息列表
        const observationStr = reactParser.formatObservation(latestStep.observation);
        const toolResultMessage = `Tool Result:\n---\n${observationStr}\n---\nPlease continue.`;

        baseMessages.push({ role: 'assistant', content: aiContent });
        baseMessages.push({ role: 'user', content: toolResultMessage });

        // 根据 keepContext 决定是否保留上下文
        if (latestStep.keepContext) {
          this.addMessage('assistant', aiContent, true);
          this.addMessage('user', toolResultMessage, true);
        }
      }

      // 检查是否已有最终答案
      if (reactParser.hasFinalAnswer(steps)) {
        break;
      }
    }

    const success = iteration < this.maxIterations && finalAnswer.length > 0;

    return {
      answer: finalAnswer || steps[steps.length - 1]?.observation?.error || 'Unable to complete task',
      steps,
      iterations: iteration,
      success,
      error: iteration >= this.maxIterations ? 'Max iterations reached' : undefined,
      usage: totalUsage,
    };
  }

  /**
   * 执行工具
   * @param name 工具名称
   * @param args 工具参数
   * @returns 执行结果
   */
  private async executeTool(
    name: string,
    args: Record<string, any>
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const result = await this.toolService.execute(name, args);
      return { success: true, data: result };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  }

  /**
   * 获取所有内置工具定义
   * @returns 工具定义列表
   */
  private async getBuiltinTools(): Promise<ToolDefinition[]> {
    const tools = await this.toolService.getAll();
    return tools.map(t => {
      const params = t.parameters as {
        type: string;
        properties: Record<string, { type: string; description: string }>;
        required: string[];
      };
      
      return {
        name: t.name,
        description: t.description,
        parameters: {
          type: 'object' as const,
          properties: params.properties || {},
          required: params.required || [],
        },
      };
    });
  }

  /**
   * 获取所有可用的技能
   * @returns 技能信息列表
   */
  private async getAvailableSkills(): Promise<SkillInfo[]> {
    if (!this.skillsManager) return [];

    await this.skillsManager.loadAll();
    const skills = this.skillsManager.getAllSkills();
    return skills.map((s: { filePath: string; name: string; description: string }) => ({
      path: s.filePath,
      name: s.name,
      description: s.description,
    }));
  }

  /**
   * 添加消息到内存服务
   * @param role 消息角色
   * @param content 消息内容
   * @param keepContext 是否保留上下文
   * @param isOriginal 是否是原始消息
   */
  private addMessage(role: 'user' | 'assistant' | 'system', content: string, keepContext: boolean, isOriginal: boolean = false): void {
    if (!this.sessionId || !this.memoryService) return;
    this.memoryService.addMessage(this.sessionId, role, content, keepContext, isOriginal);
  }
}
