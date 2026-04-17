export { HookQueue } from './hook.queue.js';
export { HookProcessor } from './hook.processor.js';
export type { HookTrigger, HookMessage, IHookHandler } from './hook.types.js';
export { HookHandler, MemoryHandler, SkillHandler } from './handlers/index.js';

import { HookQueue, HookProcessor } from './index.js';
import { MemoryHandler, SkillHandler } from './handlers/index.js';

export function createHooks(): { queue: HookQueue; processor: HookProcessor } {
  const queue = new HookQueue();
  const processor = new HookProcessor(queue);

  queue.register(new MemoryHandler());
  queue.register(new SkillHandler());

  processor.startProcessing();

  return { queue, processor };
}

export const hooks = createHooks();