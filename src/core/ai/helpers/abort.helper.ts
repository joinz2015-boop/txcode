export function createIterationSignal(externalSignal?: AbortSignal): {
  signal: AbortSignal;
  cleanup: () => void;
} {
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  if (externalSignal) {
    externalSignal.addEventListener('abort', onAbort);
  }
  return {
    signal: controller.signal,
    cleanup: () => {
      if (externalSignal) {
        externalSignal.removeEventListener('abort', onAbort);
      }
    },
  };
}
