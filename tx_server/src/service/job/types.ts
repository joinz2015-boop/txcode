export interface IJob {
  name: string
  init(): Promise<void>
  shutdown(): Promise<void>
}
