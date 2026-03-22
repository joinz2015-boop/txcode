declare module 'ink' {
  import * as React from 'react';
  
  export function render(
    element: React.ReactElement,
    options?: { stdout?: NodeJS.WriteStream; stdin?: NodeJS.ReadStream; debug?: boolean }
  ): {
    unmount: () => void;
    waitUntilExit: () => Promise<void>;
  };
  
  export const Box: React.FC<any>;
  export const Text: React.FC<any>;
  
  export function useInput(
    handler: (input: string, key: { return?: boolean; backspace?: boolean; delete?: boolean; escape?: boolean; ctrl?: boolean; meta?: boolean }) => void
  ): void;
  
  export function useApp(): { exit: () => void };
  
  export function useStdin(): { stdin: NodeJS.ReadStream };
}