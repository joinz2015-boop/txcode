/**
 * Alternate Buffer 模式 Hook
 * 简化版本 - 禁用 Alternate Buffer
 */

export function isAlternateBufferEnabled(): boolean {
  return false;
}

export function useAlternateBuffer(enabled: boolean = true): boolean {
  return false;
}

export function enterAlternateScreen(): void {}

export function exitAlternateScreen(): void {}

export function enableMouseEvents(): void {}

export function disableMouseEvents(): void {}

export function disableLineWrapping(): void {}

export function enableLineWrapping(): void {}

export function useRefreshStatic() {
  return () => {};
}
