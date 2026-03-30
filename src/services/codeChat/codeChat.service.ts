import { aiService } from '../../modules/ai/ai.service.js';
import { sessionService } from '../../modules/session/session.service.js';
import { memoryService } from '../../modules/memory/index.js';
import { ChatInput, ChatOptions, ChatResult, Step } from './codeChat.types.js';
import { Session } from '../../modules/session/session.types.js';

export class CodeChatService {

  async handleChat(input: ChatInput): Promise<ChatResult> {
    const session = this.getOrCreateSession(input);

    return this.chatWithAI(input.message, {
      sessionId: session.id,
      projectPath: session.projectPath ?? undefined,
      abortSignal: input.abortSignal,
      modelName: input.modelName,
      onStep: input.onStep,
      onCompact: input.onCompact,
    });
  }

  private getOrCreateSession(input: ChatInput): Session {
    let session = input.sessionId ? sessionService.get(input.sessionId) : null;
    if (!session) {
      session = sessionService.create('New Chat', input.projectPath || undefined);
    }
    sessionService.switchTo(session.id);
    return session;
  }

  private async chatWithAI(message: string, options: ChatOptions): Promise<ChatResult> {
    const reactSteps: any[] = [];

    const result = await aiService.chatWithTools(message, {
      sessionId: options.sessionId,
      projectPath: options.projectPath,
      abortSignal: options.abortSignal,
      modelName: options.modelName,
      memoryService,
      onStep: (step: any, iteration: number) => {
        const reactFormatStep: Step = {
          thought: step.thought || step.reasoning || '',
          toolCalls: step.toolCalls || [],
          success: step.success ?? true,
        };
        reactSteps.push({ iteration, ...reactFormatStep });
        options.onStep?.(reactFormatStep, iteration);
      },
      onCompact: options.onCompact,
    });

    return {
      answer: result.answer || '',
      iterations: result.iterations || 0,
      success: result.success,
      usage: result.usage,
      reactSteps,
      sessionId: options.sessionId,
    };
  }
}
