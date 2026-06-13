import { DreamTask, IDreamHandler } from '../../../services/dream/dream.types.js'

export class DreamQueue {
  private handlers: Map<string, IDreamHandler[]> = new Map()
  private tasks: DreamTask[] = []
  private running: boolean = false
  private waitResolve: (() => void) | null = null

  register(handler: IDreamHandler): void {
    const existing = this.handlers.get(handler.dreamType) || []
    existing.push(handler)
    this.handlers.set(handler.dreamType, existing)
  }

  getHandlers(type: string): IDreamHandler[] {
    return this.handlers.get(type) || []
  }

  enqueue(task: DreamTask): void {
    this.tasks.push(task)
    if (this.waitResolve) {
      this.waitResolve()
      this.waitResolve = null
    }
  }

  wait(): Promise<DreamTask | null> {
    if (this.tasks.length > 0) {
      return Promise.resolve(this.tasks.shift() || null)
    }
    return new Promise((resolve) => {
      this.waitResolve = () => {
        resolve(this.tasks.shift() || null)
      }
    })
  }

  async start(): Promise<void> {
    if (this.running) return
    this.running = true

    while (this.running) {
      try {
        const task = await this.wait()
        if (!task) continue
        const handlers = this.getHandlers(task.type)
        for (const handler of handlers) {
          try {
            await handler.handle(task)
          } catch (error) {
            console.error(`[DreamQueue] Handler error for type "${task.type}":`, error)
          }
        }
      } catch (error) {
        console.error('[DreamQueue] Processing error:', error)
      }
    }
  }

  stop(): void {
    this.running = false
    if (this.waitResolve) {
      this.waitResolve()
      this.waitResolve = null
    }
  }
}
