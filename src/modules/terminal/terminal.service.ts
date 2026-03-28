/**
 * 终端服务模块
 * 
 * 使用 Python pty 实现跨平台终端功能
 */

import { spawn, ChildProcess, StdioOptions } from 'child_process';
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

interface PtyProcess {
  proc: ChildProcess;
  session: TerminalSession;
  onOutput: OutputCallback;
  onExit: ExitCallback;
}

const PYTHON_PTY_SCRIPT = `
import pty
import os
import sys
import select
import signal

pid, fd = pty.fork()

if pid == 0:
    # Child process - exec bash
    os.execvp('bash', ['bash'])
else:
    # Parent process - relay I/O
    def write_all(data):
        sys.stdout.write(data)
        sys.stdout.flush()
    
    signal.signal(signal.SIGTERM, lambda *args: sys.exit(0))
    
    try:
        while True:
            r, _, _ = select.select([0, fd], [], [], 0.1)
            if 0 in r:
                try:
                    data = os.read(0, 4096)
                    if not data:
                        break
                    os.write(fd, data)
                except OSError:
                    break
            if fd in r:
                try:
                    data = os.read(fd, 4096)
                    if data:
                        write_all(data.decode('utf-8', errors='replace'))
                except OSError:
                    break
    except KeyboardInterrupt:
        pass
    finally:
        os.close(fd)
        os.close(0)
        os.close(1)
        os.close(2)
`;

class TerminalService {
  private ptyProcesses: Map<string, PtyProcess> = new Map();
  private sessions: Map<string, TerminalSession> = new Map();

  async checkPythonAvailable(): Promise<{ available: boolean; version: string; error?: string }> {
    return new Promise((resolve) => {
      const proc = spawn('python3', ['--version'], { shell: false });
      
      proc.on('error', (err) => {
        resolve({ available: false, version: '', error: err.message });
      });
      
      proc.on('close', (code) => {
        if (code === 0) {
          resolve({ available: true, version: '3.x' });
        } else {
          resolve({ available: false, version: '', error: 'Python not found' });
        }
      });
    });
  }

  private createPtySession(options: TerminalOptions = {}): TerminalSession {
    const id = uuidv4();
    const platform = os.platform();
    const cwd = options.cwd || process.cwd();
    const cols = options.cols || 80;
    const rows = options.rows || 24;

    const session: TerminalSession = {
      id,
      title: `终端 ${id.slice(0, 8)}`,
      platform: platform === 'win32' ? 'windows' : platform === 'darwin' ? 'darwin' : 'linux',
      shell: '/bin/bash',
      createdAt: new Date(),
      isPty: true,
    };

    const proc = spawn('python3', ['-u', '-c', PYTHON_PTY_SCRIPT], {
      cwd,
      env: {
        ...process.env,
        TERM: 'xterm-256color',
        COLS: String(cols),
        ROWS: String(rows),
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    proc.stdout?.on('data', (data: Buffer) => {
      const entry = this.ptyProcesses.get(id);
      if (entry && entry.onOutput) {
        entry.onOutput(data.toString());
      }
    });

    proc.stderr?.on('data', (data: Buffer) => {
      const entry = this.ptyProcesses.get(id);
      if (entry && entry.onOutput) {
        entry.onOutput(data.toString());
      }
    });

    proc.on('close', (code) => {
      const entry = this.ptyProcesses.get(id);
      if (entry && entry.onExit) {
        entry.onExit(code || 0);
      }
    });

    proc.on('error', (err) => {
      console.error(`[Terminal] PTY process error for ${id}:`, err);
    });

    this.ptyProcesses.set(id, {
      proc,
      session,
      onOutput: () => {},
      onExit: () => {},
    });

    this.sessions.set(id, session);
    console.log(`[Terminal] Created PTY session ${id}`);
    return session;
  }

  async createSession(options: TerminalOptions = {}): Promise<TerminalSession> {
    const pythonCheck = await this.checkPythonAvailable();
    
    if (!pythonCheck.available) {
      throw new Error('Python 3.6+ 未安装。请安装 Python 后重试。\nmacOS: brew install python3\nUbuntu: sudo apt install python3\nWindows: 从 python.org 下载安装');
    }

    return this.createPtySession(options);
  }

  getSession(id: string): TerminalSession | null {
    return this.sessions.get(id) || null;
  }

  getAllSessions(): TerminalSession[] {
    return Array.from(this.sessions.values());
  }

  deleteSession(id: string): void {
    const entry = this.ptyProcesses.get(id);
    if (entry) {
      try {
        entry.proc.kill('SIGTERM');
      } catch (e) {
        console.error(`Failed to kill PTY for session ${id}:`, e);
      }
      this.ptyProcesses.delete(id);
    }
    this.sessions.delete(id);
  }

  write(id: string, data: string): void {
    const entry = this.ptyProcesses.get(id);
    if (entry) {
      entry.proc.stdin?.write(data);
    }
  }

  resize(id: string, cols: number, rows: number): void {
    // PTY handles resize via SIGWINCH in a full implementation
    // For now, this is a no-op as Python pty doesn't directly support resize
  }

  setCallbacks(id: string, onOutput: OutputCallback, onExit: ExitCallback): void {
    const entry = this.ptyProcesses.get(id);
    if (entry) {
      entry.onOutput = onOutput;
      entry.onExit = onExit;
    }
  }

  isSessionAlive(id: string): boolean {
    const entry = this.ptyProcesses.get(id);
    if (entry) {
      return entry.proc.exitCode === null;
    }
    return false;
  }

  getPlatform(id: string): string {
    const session = this.sessions.get(id);
    return session ? session.platform : 'unknown';
  }

  isPtyMode(id: string): boolean {
    return this.ptyProcesses.has(id);
  }
}

export const terminalService = new TerminalService();
