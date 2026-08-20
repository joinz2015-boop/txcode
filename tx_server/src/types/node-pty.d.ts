declare module 'node-pty' {
  export interface IPty {
    pid: number;
    cols: number;
    rows: number;
    title: string;
    
    onData(callback: (data: string) => void): void;
    onExit(callback: (exit: { exitCode: number }) => void): void;
    
    write(data: string): void;
    resize(cols: number, rows: number): void;
    kill(signal?: string): void;
  }

  export interface SpawnOptions {
    name?: string;
    cols?: number;
    rows?: number;
    cwd?: string;
    env?: { [key: string]: string };
    executable?: string;
    args?: string[];
  }

  export function spawn(
    command: string,
    args?: string[],
    options?: SpawnOptions
  ): IPty;

  export function getTerminalProfiles(): Promise<{ [key: string]: string }>;
  export function getEnvironment(): { [key: string]: string };
  export function isAvailable(shell: string): Promise<boolean>;
}
