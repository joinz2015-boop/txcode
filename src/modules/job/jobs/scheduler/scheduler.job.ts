import type { IJob } from '../../types.js'
import { schedulerService } from '../../../scheduler/scheduler.module.js'

export class SchedulerJob implements IJob {
  name = 'scheduler'

  async init(): Promise<void> {
    schedulerService.init()
  }

  async shutdown(): Promise<void> {
    schedulerService.shutdown()
  }
}
