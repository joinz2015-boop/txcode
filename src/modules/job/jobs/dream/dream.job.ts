import type { IJob } from '../../types.js'
import { dreamService } from '../../../../services/dream/dream.service.js'

export class DreamJob implements IJob {
  name = 'dream'

  async init(): Promise<void> {
    dreamService.init()
  }

  async shutdown(): Promise<void> {
    dreamService.shutdown()
  }
}
