import type { IJob } from '../../types.js'
import { sessionService } from '../../../../services/session/index.js'

export class SessionCleanupJob implements IJob {
  name = 'session-cleanup'

  async init(): Promise<void> {
    sessionService.cleanStaleSessions()
  }

  async shutdown(): Promise<void> {
    // No-op: one-time cleanup, no persistent state
  }
}
