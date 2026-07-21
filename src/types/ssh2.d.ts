declare module 'ssh2' {
  import { EventEmitter } from 'events';

  export interface ConnectConfig {
    host: string;
    port?: number;
    username: string;
    password?: string;
    privateKey?: string;
    passphrase?: string;
    readyTimeout?: number;
    keepaliveInterval?: number;
    keepaliveCountMax?: number;
  }

  export interface ClientChannel extends EventEmitter {
    stderr: EventEmitter;
    write(data: string): void;
    signal(signal: string): void;
  }

  export class Client extends EventEmitter {
    connect(config: ConnectConfig): void;
    shell(options: { term?: string; cols?: number; rows?: number }, callback: (err: Error | undefined, stream: ClientChannel) => void): void;
    exec(command: string, callback: (err: Error | undefined, stream: ClientChannel) => void): void;
    end(): void;
    destroy(): void;
  }
}
