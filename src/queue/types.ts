export interface IQueue<T> {
  enqueue(item: T): void
  wait(): Promise<T | null>
}
