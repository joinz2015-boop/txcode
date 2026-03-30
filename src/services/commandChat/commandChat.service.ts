import { executeCommand } from '../../cli/commands.js';
import { memoryService } from '../../modules/memory/index.js';

export interface CommandInput {
  message: string;
  sessionId?: string;
}

export interface CommandResult {
  answer: string;
  success: boolean;
  sessionId?: string;
  data?: any;
}

export class CommandChatService {

  async handleCommand(input: CommandInput): Promise<CommandResult> {
    const { message, sessionId } = input;

    if (!message.trim().startsWith('/')) {
      throw new Error('Not a command');
    }

    const cmdResult = await executeCommand(message.trim());


    return {
      answer: cmdResult.message || '命令已执行',
      success: cmdResult.success,
      sessionId,
      data: cmdResult.data,
    };
  }
}

export const commandChatService = new CommandChatService();