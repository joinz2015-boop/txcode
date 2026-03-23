import { OpenAIProvider } from './openai.provider.js';
import { ChatMessage } from './ai.types.js';
import { ToolService } from '../tools/tool.service.js';
import { SkillsManager } from '../skill/skills.manager.js';
import { MemoryService } from '../memory/memory.service.js';
import { reactParser } from './react/react.parser.js';
import { buildReActPrompt } from './react/react.prompts.js';
import { ReActStep, ReActResult, ToolDefinition, SkillInfo } from './react/react.types.js';

export interface ReActAgentConfig {
  provider: OpenAIProvider;
  toolService: ToolService;
  skillsManager?: SkillsManager;
  memoryService?: MemoryService;
  maxIterations?: number;
  projectPath?: string;
  sessionId?: string;
}

export interface ReActRunOptions {
  onStep?: (step: ReActStep, iteration: number) => void;
  historyMessages?: ChatMessage[];
}

export class ReActAgent {
  private provider: OpenAIProvider;
  private toolService: ToolService;
  private skillsManager?: SkillsManager;
  private memoryService?: MemoryService;
  private maxIterations: number;
  private projectPath?: string;
  private sessionId?: string;

  constructor(config: ReActAgentConfig) {
    this.provider = config.provider;
    this.toolService = config.toolService;
    this.skillsManager = config.skillsManager;
    this.memoryService = config.memoryService;
    this.maxIterations = config.maxIterations || 50;
    this.projectPath = config.projectPath;
    this.sessionId = config.sessionId;
  }

  async run(
    userMessage: string,
    options?: ReActRunOptions
  ): Promise<ReActResult> {
    const steps: ReActStep[] = [];
    const messages: ChatMessage[] = [];

    const permanentMessages = this.getPermanentMessages();
    for (const msg of permanentMessages) {
      messages.push({ role: msg.role as 'user' | 'assistant' | 'system' | 'tool', content: msg.content });
    }

    const skills = await this.getAvailableSkills();
    const builtinTools = this.getBuiltinTools();
    const systemPrompt = await buildReActPrompt(builtinTools, skills, this.maxIterations);
    
    messages.push({ role: 'system', content: systemPrompt });
    messages.push({ role: 'user', content: userMessage });

    this.addMessage('user', userMessage, true);

    let iteration = 0;
    let finalAnswer = '';
    let totalUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

    while (iteration < this.maxIterations) {
      iteration++;

      const response = await this.provider.chat(messages);
      
      if (response.usage) {
        totalUsage.promptTokens += response.usage.promptTokens;
        totalUsage.completionTokens += response.usage.completionTokens;
        totalUsage.totalTokens += response.usage.totalTokens;
      }

      const aiContent = response.content || '';

      const parsed = reactParser.parse(aiContent);
      
      if (parsed.steps.length === 0) {
        finalAnswer = aiContent;
        break;
      }

      const latestStep = parsed.steps[parsed.steps.length - 1];

      if (latestStep.final_answer) {
        finalAnswer = latestStep.final_answer;
        steps.push(latestStep);
        this.addMessage('assistant', finalAnswer, true);
        break;
      }

      if (latestStep.action && latestStep.action !== 'final_answer') {
        const toolResult = await this.executeTool(
          latestStep.action,
          latestStep.actionInput
        );

        latestStep.observation = toolResult.success 
          ? toolResult.data 
          : { error: toolResult.error };
        
        steps.push(latestStep);
        options?.onStep?.(latestStep, iteration);

        const observationStr = reactParser.formatObservation(latestStep.observation);
        messages.push({ role: 'assistant', content: aiContent });
        messages.push({ 
          role: 'user', 
          content: `工具执行结果：\n---\n${observationStr}\n---\n请继续思考下一步操作。`
        });

        if (latestStep.action === 'loadSkill' && this.skillsManager) {
          await this.skillsManager.loadAll();
        }
      }

      if (reactParser.hasFinalAnswer(steps)) {
        break;
      }
    }

    const success = iteration < this.maxIterations && finalAnswer.length > 0;

    if (this.sessionId && this.memoryService) {
      this.memoryService.compressSession(this.sessionId, 5);
    }

    return {
      answer: finalAnswer || steps[steps.length - 1]?.observation?.error || '无法完成任务',
      steps,
      iterations: iteration,
      success,
      error: iteration >= this.maxIterations ? '达到最大迭代次数' : undefined,
      usage: totalUsage,
    };
  }

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

  private getBuiltinTools(): ToolDefinition[] {
    const tools = this.toolService.getAll();
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

  private getPermanentMessages(): Array<{ role: string; content: string }> {
    if (!this.sessionId || !this.memoryService) return [];
    const allMessages = this.memoryService.getPermanentMessages(this.sessionId);
    return allMessages
      .filter(m => m.role === 'user' || m.role === 'assistant' || m.role === 'system')
      .map(m => ({ role: m.role, content: m.content }));
  }

  private addMessage(role: 'user' | 'assistant' | 'system', content: string, permanent: boolean): void {
    if (!this.sessionId || !this.memoryService) return;
    this.memoryService.addMessage(this.sessionId, role, content, permanent);
  }
}
