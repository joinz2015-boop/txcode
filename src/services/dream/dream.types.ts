export interface DreamTask {
  id: string
  type: string
  createdAt: Date
  data?: any
}

export interface IDreamHandler {
  dreamType: string
  handle(task: DreamTask): Promise<void>
}
