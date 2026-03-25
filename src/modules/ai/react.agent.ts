import { OpenAIProvider } from './openai.provider.js';
import { ChatMessage } from './ai.types.js';
import { ToolService } from '../tools/tool.service.js';
import { SkillsManager } from '../skill/skills.manager.js';
import { MemoryService } from '../memory/memory.service.js';
import { SessionService, sessionService as defaultSessionService } from '../session/session.service.js';
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
  private sessionService: SessionService;
  private maxIterations: number;
  private projectPath?: string;
  private sessionId?: string;

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

  async run(
    userMessage: string,
    options?: ReActRunOptions
  ): Promise<ReActResult> {
    const steps: ReActStep[] = [];
    const baseMessages: ChatMessage[] = [];

    const skills = await this.getAvailableSkills();
    const builtinTools = await this.getBuiltinTools();
    const systemPrompt = await buildReActPrompt(builtinTools, skills, this.maxIterations);

    if (options?.historyMessages && options.historyMessages.length > 0) {
      for (const msg of options.historyMessages) {
        if (msg.role !== 'system') {
          baseMessages.push(msg);
        }
      }
    }

    baseMessages.push({ role: 'user', content: userMessage });

    this.addMessage('user', userMessage, true, true);

    let iteration = 0;
    let finalAnswer = '';
    let totalUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

    while (iteration < this.maxIterations) {
      iteration++;

      const messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        ...baseMessages
      ];

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
        this.addMessage('assistant', finalAnswer, true);
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
        const toolResultMessage = `Tool Result:\n---\n${observationStr}\n---\nPlease continue.`;

        baseMessages.push({ role: 'assistant', content: aiContent });
        baseMessages.push({ role: 'user', content: toolResultMessage });

        if (latestStep.keepContext) {
          this.addMessage('assistant', aiContent, true);
          this.addMessage('user', toolResultMessage, true);
        }

        if (latestStep.action === 'loadSkill' && this.skillsManager) {
          await this.skillsManager.loadAll();
        }
      }

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

  private addMessage(role: 'user' | 'assistant' | 'system', content: string, keepContext: boolean, isOriginal: boolean = false): void {
    if (!this.sessionId || !this.memoryService) return;
    this.memoryService.addMessage(this.sessionId, role, content, keepContext, isOriginal);
  }
}
