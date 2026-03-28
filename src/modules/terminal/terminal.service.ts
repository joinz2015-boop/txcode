/**
 * 终端服务模块
 * 
 * 提供跨平台终端会话管理功能：
 * - 创建/删除终端会话
 * - PTY 进程管理
 * - WebSocket 实时通信
 * 
 * 降级策略：
 * 1. 优先使用 node-pty (完整终端功能)
 * 2. 不可用时降级到 child_process.spawn (基本功能)
 */

import { spawn, ChildProcess } from 'child_process';
import * as os from 'os';
import { v4 as uuidv4 } from 'uuid';

export interface TerminalSession {
  id: string;
  title: string;
  platform: 'windows' | 'darwin' | 'linux';
  shell: string;
  createdAt: Date;
  isPty: boolean;
}

export interface TerminalOptions {
  cols?: number;
  rows?: number;
  cwd?: string;
}

type OutputCallback = (data: string) => void;
type ExitCallback = (code: number) => void;

let nodePty: any = null;
let nodePtyLoadFailed = false;

export function isNodePtyAvailable(): boolean {
  return !nodePtyLoadFailed && nodePty !== null;
}

async function loadNodePty() {
  if (nodePtyLoadFailed) {
    return null;
  }
  
  if (nodePty) return nodePty;
  
  try {
    nodePty = await import('node-pty');
    return nodePty;
  } catch (e) {
    nodePtyLoadFailed = true;
    console.warn('[Terminal] node-pty not available, falling back to basic spawn');
    return null;
  }
}

function getShell(): string {
  const platform = os.platform();
  
  if (platform === 'win32') {
    return process.env.COMSPEC || 'cmd.exe';
  }
  
  const shell = process.env.SHELL;
  if (shell) return shell;
  
  if (platform === 'darwin') {
    return '/bin/zsh';
  }
  
  return '/bin/bash';
}

function getPlatformType(): 'windows' | 'darwin' | 'linux' {
  const platform = os.platform();
  if (platform === 'win32') return 'windows';
  if (platform === 'darwin') return 'darwin';
  return 'linux';
}

interface PtyEntry {
  pty: any;
  session: TerminalSession;
  onOutput: OutputCallback;
  onExit: ExitCallback;
}

interface SpawnEntry {
  proc: ChildProcess;
  session: TerminalSession;
  onOutput: OutputCallback;
  onExit: ExitCallback;
}

class TerminalService {
  private ptySessions: Map<string, PtyEntry> = new Map();
  private spawnSessions: Map<string, SpawnEntry> = new Map();
  private pendingBuffers: Map<string, string[]> = new Map();

  private sessions: Map<string, TerminalSession> = new Map();

  async createSession(options: TerminalOptions = {}): Promise<TerminalSession> {
    const id = uuidv4();
    const shell = getShell();
    const platform = getPlatformType();
    const cwd = options.cwd || os.homedir();
    const cols = options.cols || 80;
    const rows = options.rows || 24;

    const session: TerminalSession = {
      id,
      title: `终端 ${id.slice(0, 8)}`,
      platform,
      shell,
      createdAt: new Date(),
      isPty: false,
    };

    const pty = await loadNodePty();

    if (pty) {
      try {
        const ptyProcess = pty.spawn(shell, [], {
          name: 'xterm-256color',
          cols,
          rows,
          cwd,
          env: {
            ...process.env,
            TERM: 'xterm-256color',
            COLORTERM: 'truecolor',
          } as { [key: string]: string },
        });

        this.ptySessions.set(id, {
          pty: ptyProcess,
          session,
          onOutput: () => {},
          onExit: () => {},
        });

        this.pendingBuffers.set(id, []);

        ptyProcess.onData((data: string) => {
          const entry = this.ptySessions.get(id);
          const buffers = this.pendingBuffers.get(id);
          if (buffers) {
            buffers.push(data);
          }
          if (entry?.onOutput) {
            entry.onOutput(data);
          }
        });

        ptyProcess.onExit(({ exitCode }: { exitCode: number }) => {
          const entry = this.ptySessions.get(id);
          if (entry?.onExit) {
            entry.onExit(exitCode);
          }
        });

        session.isPty = true;
      } catch (e) {
        console.warn(`[Terminal] Failed to spawn PTY, falling back to basic spawn:`, e);
        this.createSpawnSession(session, cwd, cols, rows);
      }
    } else {
      this.createSpawnSession(session, cwd, cols, rows);
    }

    this.sessions.set(id, session);
    return session;
  }

  private createSpawnSession(session: TerminalSession, cwd: string, cols: number, rows: number): void {
    const isWindows = session.platform === 'windows';

    let proc: ChildProcess;
    if (isWindows) {
      proc = spawn('cmd.exe', ['/c'], {
        cwd,
        env: {
          ...process.env,
          TERM: 'xterm-256color',
        },
        shell: false,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    } else {
      proc = spawn('/bin/sh', ['-c', ''], {
        cwd,
        env: {
          ...process.env,
          TERM: 'xterm-256color',
        },
        shell: false,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    }

    this.spawnSessions.set(session.id, {
      proc,
      session,
      onOutput: () => {},
      onExit: () => {},
    });

    proc.stdout?.on('data', (data: Buffer) => {
      const entry = this.spawnSessions.get(session.id);
      if (entry) {
        entry.onOutput(data.toString());
      }
    });

    proc.stderr?.on('data', (data: Buffer) => {
      const entry = this.spawnSessions.get(session.id);
      if (entry) {
        entry.onOutput(data.toString());
      }
    });

    proc.on('exit', (code: number | null) => {
      const entry = this.spawnSessions.get(session.id);
      if (entry) {
        entry.onExit(code || 0);
      }
    });

    console.log(`[Terminal] Created basic spawn session ${session.id}`);
  }

  getSession(id: string): TerminalSession | null {
    return this.sessions.get(id) || null;
  }

  getAllSessions(): TerminalSession[] {
    return Array.from(this.sessions.values());
  }

  deleteSession(id: string): void {
    const ptyEntry = this.ptySessions.get(id);
    if (ptyEntry) {
      try {
        ptyEntry.pty.kill();
      } catch (e) {
        console.error(`Failed to kill PTY for session ${id}:`, e);
      }
      this.ptySessions.delete(id);
    }

    const spawnEntry = this.spawnSessions.get(id);
    if (spawnEntry) {
      try {
        spawnEntry.proc.kill();
      } catch (e) {
        console.error(`Failed to kill spawn for session ${id}:`, e);
      }
      this.spawnSessions.delete(id);
    }

    this.sessions.delete(id);
  }

  write(id: string, data: string): void {
    const ptyEntry = this.ptySessions.get(id);
    if (ptyEntry) {
      ptyEntry.pty.write(data);
      return;
    }

    const spawnEntry = this.spawnSessions.get(id);
    if (spawnEntry) {
      if (data === '\x03') {
        spawnEntry.proc.kill('SIGINT');
      } else if (data === '\x04') {
        spawnEntry.proc.stdin?.end();
      } else {
        if (spawnEntry.session.platform === 'windows') {
          const normalized = data.replace(/\n/g, '\r\n');
          spawnEntry.proc.stdin?.write(normalized);
        } else {
          spawnEntry.proc.stdin?.write(data);
        }
      }
    }
  }

  resize(id: string, cols: number, rows: number): void {
    const ptyEntry = this.ptySessions.get(id);
    if (ptyEntry) {
      try {
        ptyEntry.pty.resize(cols, rows);
      } catch (e) {
        console.error(`Failed to resize PTY for session ${id}:`, e);
      }
    }
  }

  setCallbacks(id: string, onOutput: OutputCallback, onExit: ExitCallback): string[] | null {
    const ptyEntry = this.ptySessions.get(id);
    if (ptyEntry) {
      ptyEntry.onOutput = onOutput;
      ptyEntry.onExit = onExit;

      const buffers = this.pendingBuffers.get(id) || [];
      this.pendingBuffers.delete(id);
      return buffers;
    }

    const spawnEntry = this.spawnSessions.get(id);
    if (spawnEntry) {
      spawnEntry.onOutput = onOutput;
      spawnEntry.onExit = onExit;

      spawnEntry.proc.stdout?.on('data', (data: Buffer) => {
        onOutput(data.toString());
      });

      spawnEntry.proc.stderr?.on('data', (data: Buffer) => {
        onOutput(data.toString());
      });

      spawnEntry.proc.on('exit', (code: number | null) => {
        onExit(code || 0);
      });
    }
    return null;
  }

  isSessionAlive(id: string): boolean {
    return this.sessions.has(id);
  }

  getPlatform(id: string): string {
    const session = this.sessions.get(id);
    return session ? session.platform : 'unknown';
  }

  isPtyMode(id: string): boolean {
    const ptyEntry = this.ptySessions.get(id);
    return !!ptyEntry;
  }
}

export const terminalService = new TerminalService();
