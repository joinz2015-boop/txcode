import { HookMessage, HookTrigger, IHookHandler } from '../hook.types.js';

export abstract class HookHandler implements IHookHandler {
  abstract trigger: HookTrigger;
  alternateTriggers?: HookTrigger[] = [];

  abstract handle(message: HookMessage): Promise<void>;

  protected getProjectPath(message: HookMessage): string {
    return message.metadata.projectPath || process.cwd();
  }

  protected getSessionId(message: HookMessage): string {
    return message.metadata.sessionId;
  }
}