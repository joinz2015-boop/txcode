import { ChatMessage } from '../../ai.types.js';
import { specInjector } from '../../../../modules/spec/index.js';

export class RewriteUserMessage {
  private projectPath: string;
  private planFilePath?: string;
  private messageCount: number;
  private _injectedMessage: string = '';

  constructor(projectPath: string, planFilePath?: string, messageCount: number = 0) {
    this.projectPath = projectPath;
    this.planFilePath = planFilePath;
    this.messageCount = messageCount;
  }

  get shouldInjectSpec(): boolean {
    return specInjector.shouldInject(this.messageCount);
  }

  get injectedMessage(): string {
    return this._injectedMessage;
  }

  rewrite(originalMessage: string): string {
    let result = this.appendPlanInstruction(originalMessage);
    if (this.shouldInjectSpec) {
      result = specInjector.injectIntoMessage(result, this.projectPath);
    }
    return result;
  }

  prepare(
    baseMessages: ChatMessage[],
    userMessage: string,
    mediaFiles: { filePath: string; type: string; dataUrl?: string }[] | undefined,
    pushFn: (msg: string, media?: { filePath: string; type: string; dataUrl?: string }[]) => void
  ): void {
    if (this.shouldInjectSpec) {
      const rewritten = this.rewrite(userMessage);
      pushFn(rewritten, mediaFiles);
    } else {
      this.rewriteFirstUserMessage(baseMessages);
      pushFn(this.rewrite(userMessage), mediaFiles);
    }
    this._injectedMessage = this.rewrite(userMessage);
  }

  private rewriteFirstUserMessage(baseMessages: ChatMessage[]): void {
    const firstUserIndex = baseMessages.findIndex(m => m.role === 'user');
    if (firstUserIndex >= 0) {
      const originalFirstUser = baseMessages[firstUserIndex].content;
      if (typeof originalFirstUser === 'string') {
        baseMessages[firstUserIndex].content = this.rewrite(originalFirstUser);
      } else {
        const textPart = originalFirstUser.find(c => c.type === 'text');
        if (textPart) {
          (textPart as any).text = this.rewrite((textPart as any).text);
        }
      }
    }
  }

  private appendPlanInstruction(message: string): string {
    if (!this.planFilePath) return message;
    return message + `\n\n请在${this.planFilePath}中生成方案文档内容`;
  }
}
