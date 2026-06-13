import { DreamQueue } from '../../queue/queues/dream/dream.queue.js'
import { InitHandler } from './handlers/init.handler.js'
import { v4 as uuidv4 } from 'uuid'

class DreamService {
  private intervalMs = 30 * 60 * 1000
  private timer: NodeJS.Timeout | null = null
  private queue: DreamQueue = new DreamQueue()

  init(): void {
    this.queue.register(new InitHandler())
    this.queue.start()

    this.queue.enqueue({
      id: uuidv4(),
      type: 'init',
      createdAt: new Date(),
    })

    this.timer = setInterval(() => {
      this.queue.enqueue({
        id: uuidv4(),
        type: 'init',
        createdAt: new Date(),
      })
    }, this.intervalMs)

  }

  shutdown(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
    this.queue.stop()
  }

  enqueue(): void {
    this.queue.enqueue({
      id: uuidv4(),
      type: 'init',
      createdAt: new Date(),
    })
  }
}

export const dreamService = new DreamService()
