/**
 * ReAct Agent
 * 
 * 职责：
 * - 实现 ReAct 循环（思考-行动-观察）
 * - 管理工具调用
 * - 追踪迭代次数
 */

import { OpenAIProvider } from './openai.provider.js';
import {
  ChatMessage,
  ChatResponse,
  ReActState,
  ToolDefinition,
} from './ai.types.js';
import { ToolService } from '../tools/tool.service.js';

export interface ReActAgentConfig {
  provider: OpenAIProvider;
  toolService: ToolService;
  maxIterations?: number;
  systemPrompt?: string;
}

export class ReActAgent {
  private provider: OpenAIProvider;
  private toolService: ToolService;
  private maxIterations: number;
  private systemPrompt: string;

  constructor(config: ReActAgentConfig) {
    this.provider = config.provider;
    this.toolService = config.toolService;
    this.maxIterations = config.maxIterations || 10;
    this.systemPrompt = config.systemPrompt || this.getDefaultSystemPrompt();
  }

  /**
   * 执行 ReAct 循环
   */
  async run(
    userMessage: string,
    onStep?: (state: ReActState, iteration: number) => void
  ): Promise<ReActState> {
    const messages: ChatMessage[] = [
      { role: 'system', content: this.systemPrompt },
      { role: 'user', content: userMessage },
    ];

    const tools = this.getToolDefinitions();
    
    let totalUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

    for (let i = 0; i < this.maxIterations; i++) {
      const response = await this.provider.chat(messages, { tools });
      
      if (response.usage) {
        totalUsage.totalTokens += response.usage.totalTokens;
        totalUsage.promptTokens += response.usage.promptTokens;
        totalUsage.completionTokens += response.usage.completionTokens;
      }

      if (response.finishReason === 'tool_calls' && response.toolCalls) {
        for (const toolCall of response.toolCalls) {
          const toolName = toolCall.function.name;
          const toolArgs = JSON.parse(toolCall.function.arguments);

          const observation = await this.executeTool(toolName, toolArgs);

          messages.push({
            role: 'assistant',
            content: response.content || '',
            toolCalls: response.toolCalls,
          });

          messages.push({
            role: 'tool',
            content: observation,
            toolCallId: toolCall.id,
            name: toolName,
          });

          const state: ReActState = {
            thought: response.content || '',
            action: toolName,
            actionInput: JSON.stringify(toolArgs),
            observation,
            usage: totalUsage,
          };

          onStep?.(state, i + 1);
        }
      } else {
        return {
          thought: response.content,
          action: 'answer',
          actionInput: '',
          answer: response.content,
          usage: totalUsage,
        };
      }
    }

    return {
      thought: '达到最大迭代次数',
      action: 'max_iterations',
      actionInput: '',
      answer: '抱歉，我无法在限定步骤内完成此任务。',
      usage: totalUsage,
    };
  }

  /**
   * 执行工具
   */
  private async executeTool(name: string, args: Record<string, any>): Promise<string> {
    try {
      return await this.toolService.execute(name, args);
    } catch (error) {
      return `工具执行错误: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  /**
   * 获取工具定义
   */
  private getToolDefinitions(): ToolDefinition[] {
    return this.toolService.getToolDefinitions();
  }

  /**
   * 默认系统提示
   */
  private getDefaultSystemPrompt(): string {
    return `你是一个 AI 编程助手，使用 ReAct 模式进行思考和行动。

对于每个用户请求，你应该：
1. 思考（Thought）：分析问题，确定下一步
2. 行动（Action）：选择合适的工具执行
3. 观察（Observation）：查看工具返回结果
4. 重复直到得出最终答案

可用工具：
${this.toolService.getAll().map(t => `- ${t.name}: ${t.description}`).join('\n')}

当你有最终答案时，直接回复用户。`;
  }
}