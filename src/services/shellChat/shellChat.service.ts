import { Client, ClientChannel } from 'ssh2';
import { WebSocket } from 'ws';
import { memoryService } from '../memory/index.js';
import { ShellAgent } from '../../core/ai/agents/shell/shell.agent.js';
import type { BaseProvider } from '../../core/ai/ai.types.js';

interface ShellSession {
  sshClient: Client;
  ws: WebSocket;
  hostId: string;
  shellStream?: ClientChannel;
}

export class ShellChatService {
  private sessions: Map<string, ShellSession> = new Map();

  registerSession(sessionId: string, sshClient: Client, ws: WebSocket, hostId: string): void {
    this.sessions.set(sessionId, { sshClient, ws, hostId });
  }

  setShellStream(sessionId: string, stream: ClientChannel): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.shellStream = stream;
    }
  }

  getSshClient(sessionId: string): Client | null {
    const session = this.sessions.get(sessionId);
    return session?.sshClient || null;
  }

  getSession(sessionId: string): ShellSession | undefined {
    return this.sessions.get(sessionId);
  }

  writeToShell(sessionId: string, data: string): void {
    const session = this.sessions.get(sessionId);
    if (session?.shellStream) {
      session.shellStream.write(data);
    }
  }

  execCommand(
    sessionId: string,
    command: string,
    timeoutMs: number,
    maxBytes: number,
    maxLines: number
  ): Promise<{ success: boolean; output: string; error?: string; metadata?: Record<string, any> }> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return Promise.resolve({ success: false, output: '', error: '会话不存在' });
    }

    const { sshClient, ws } = session;

    const displayMsg = `\r\n$ AI执行: ${command}\r\n`;
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'shell:display', message: displayMsg }));
    }

    return new Promise((resolve) => {
      sshClient.exec(command, (err: Error | undefined, stream: ClientChannel) => {
        if (err) {
          resolve({ success: false, output: '', error: err.message });
          return;
        }

        let output = '';
        let lineCount = 0;
        let byteCount = 0;
        let resolved = false;

        const timer = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            stream.signal('SIGTERM');
            if (output.length === 0) {
              output = '(命令执行超时)';
            }
            resolve({ success: false, output, error: '命令执行超时' });
          }
        }, timeoutMs);

        stream.on('data', (data: Buffer) => {
          const text = data.toString();
          output += text;
          byteCount += data.length;
          lineCount += (text.match(/\n/g) || []).length;

          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'terminal:output', data: text }));
          }
        });

        stream.stderr.on('data', (data: Buffer) => {
          const text = data.toString();
          output += text;
          byteCount += data.length;
          lineCount += (text.match(/\n/g) || []).length;

          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'terminal:output', data: text }));
          }
        });

        stream.on('close', (code: number | null) => {
          clearTimeout(timer);
          if (resolved) return;
          resolved = true;

          if (byteCount > maxBytes || lineCount > maxLines) {
            const lines = output.split('\n');
            const truncated = lines.slice(0, maxLines).join('\n');
            output = truncated + '\n(输出超出限制，已截断)';
          }

          resolve({ success: code === 0, output, metadata: { exitCode: code ?? undefined } });
        });
      });
    });
  }

  async runAgentWithProvider(
    sessionId: string,
    userMessage: string,
    provider: BaseProvider,
    onStep: (step: any) => void,
    abortSignal?: AbortSignal
  ): Promise<{ answer: string; steps: any[]; success: boolean; iterations: number; error?: string }> {
    const agent = new ShellAgent({
      provider,
      maxIterations: 50,
      sessionId,
      memoryService,
    });

    try {
      const result = await agent.run(userMessage, {
        sessionId,
        abortSignal,
        onStep,
      });

      return {
        answer: result.answer,
        steps: result.steps,
        success: result.success,
        iterations: result.iterations,
        error: result.error,
      };
    } catch (err: any) {
      return {
        answer: '',
        steps: [],
        success: false,
        iterations: 0,
        error: err.message || 'Agent execution failed',
      };
    }
  }

  destroySession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      try { session.sshClient.end(); } catch {}
      this.sessions.delete(sessionId);
    }
  }
}

export const shellChatService = new ShellChatService();
