import { WebSocket } from 'ws';
import { Client, ClientChannel } from 'ssh2';
import { shellChatService } from '../../services/shellChat/shellChat.service.js';
import { pluginWebshellHostService } from '../../services/pluginWebshellHost/pluginWebshellHostService.js';
import { getProvider } from '../../core/ai/provider/provider.router.js';

export class ShellWebSocketHandler {
  private abortControllers: Map<string, AbortController> = new Map();
  private idleTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private readonly IDLE_TIMEOUT = 10 * 60 * 1000;

  handle(ws: WebSocket): void {
    let sessionId: string | null = null;
    let sshClient: Client | null = null;

    ws.on('message', async (data: Buffer) => {
      try {
        const msg = JSON.parse(data.toString());
        const { type, data: msgData } = msg;

        switch (type) {
          case 'terminal:connect':
            await this.handleConnect(ws, msgData, (sid, client) => {
              sessionId = sid;
              sshClient = client;
            });
            break;

          case 'terminal:input':
            this.handleInput(sessionId, msgData);
            break;

          case 'chat:message':
            await this.handleChatMessage(ws, sessionId, msgData);
            break;

          case 'terminal:disconnect':
            this.handleDisconnect(ws, sessionId);
            break;

          case 'stop':
            this.handleStop(sessionId);
            break;

          case 'ping':
            ws.send(JSON.stringify({ type: 'pong' }));
            break;

          default:
            ws.send(JSON.stringify({ type: 'error', error: 'Unknown message type: ' + type }));
        }
      } catch (e: any) {
        ws.send(JSON.stringify({ type: 'error', error: e.message }));
      }
    });

    ws.on('close', () => {
      if (sessionId) {
        this.cleanupSession(sessionId);
      }
    });

    ws.on('error', (err) => {
      console.error('[ShellWS] Error:', err);
      if (sessionId) {
        this.cleanupSession(sessionId);
      }
    });
  }

  private async handleConnect(
    ws: WebSocket,
    data: any,
    setSession: (sid: string, client: Client) => void
  ): Promise<void> {
    const { hostId } = data;
    if (!hostId) {
      ws.send(JSON.stringify({ type: 'error', error: 'hostId is required' }));
      return;
    }

    const host = pluginWebshellHostService.getById(hostId);
    if (!host) {
      ws.send(JSON.stringify({ type: 'error', error: '主机不存在' }));
      return;
    }

    const password = pluginWebshellHostService.getDecryptedPassword(hostId);
    if (!password) {
      ws.send(JSON.stringify({ type: 'error', error: '密码解密失败' }));
      return;
    }

    const sessionId = 'shell_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    const conn = new Client();

    const startIdleTimer = () => {
      const timer = setTimeout(() => {
        this.cleanupSession(sessionId);
        ws.close();
      }, this.IDLE_TIMEOUT);
      this.idleTimers.set(sessionId, timer);
    };

    conn.on('ready', () => {
      shellChatService.registerSession(sessionId, conn, ws, hostId);

      conn.shell({ term: 'xterm-256color' }, (err: Error | undefined, stream: ClientChannel) => {
        if (err) {
          ws.send(JSON.stringify({ type: 'error', error: '创建Shell会话失败: ' + err.message }));
          return;
        }

        shellChatService.setShellStream(sessionId, stream);
        setSession(sessionId, conn);

        ws.send(JSON.stringify({ type: 'terminal:ready', sessionId }));

        stream.on('data', (data: Buffer) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'terminal:output', data: data.toString() }));
          }
        });

        stream.stderr.on('data', (data: Buffer) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'terminal:output', data: data.toString() }));
          }
        });

        stream.on('close', () => {
          ws.close();
        });

        startIdleTimer();
      });
    });

    conn.on('error', (err: Error) => {
      ws.send(JSON.stringify({ type: 'error', error: 'SSH连接错误: ' + err.message }));
    });

    conn.on('close', () => {
      ws.close();
    });

    conn.connect({
      host: host.host,
      port: host.port,
      username: host.username,
      password,
      readyTimeout: 10000,
      keepaliveInterval: 30000,
    });
  }

  private handleInput(sessionId: string | null, data: string): void {
    if (!sessionId) return;
    shellChatService.writeToShell(sessionId, data);
    this.resetIdleTimer(sessionId);
  }

  private async handleChatMessage(ws: WebSocket, sessionId: string | null, data: any): Promise<void> {
    if (!sessionId) {
      ws.send(JSON.stringify({ type: 'error', error: '未连接到远程主机' }));
      return;
    }

    const { message } = data;
    if (!message) return;

    this.resetIdleTimer(sessionId);

    const abortController = new AbortController();
    this.abortControllers.set(sessionId, abortController);

    try {
      const provider = getProvider();

      const result = await shellChatService.runAgentWithProvider(
        sessionId,
        message,
        provider,
        (step: any) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'step',
              sessionId,
              data: step,
            }));
          }
        },
        abortController.signal
      );

      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'chat:response',
          sessionId,
          data: {
            answer: result.answer,
            steps: result.steps,
            success: result.success,
          },
        }));

        ws.send(JSON.stringify({
          type: 'done',
          sessionId,
          data: {
            response: result.answer,
            iterations: result.iterations,
            success: result.success,
          },
        }));
      }
    } catch (err: any) {
      if (err.message !== 'ABORTED') {
        ws.send(JSON.stringify({
          type: 'error',
          sessionId,
          error: err.message,
        }));
      } else {
        ws.send(JSON.stringify({
          type: 'stopped',
          sessionId,
          reason: 'user_cancelled',
        }));
      }
    } finally {
      this.abortControllers.delete(sessionId);
    }
  }

  private handleDisconnect(ws: WebSocket, sessionId: string | null): void {
    if (sessionId) {
      this.cleanupSession(sessionId);
    }
    ws.close();
  }

  private handleStop(sessionId: string | null): void {
    if (!sessionId) return;
    const controller = this.abortControllers.get(sessionId);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(sessionId);
    }
  }

  private cleanupSession(sessionId: string): void {
    this.abortControllers.delete(sessionId);
    shellChatService.destroySession(sessionId);
    const timer = this.idleTimers.get(sessionId);
    if (timer) {
      clearTimeout(timer);
      this.idleTimers.delete(sessionId);
    }
  }

  private resetIdleTimer(sessionId: string): void {
    const timer = this.idleTimers.get(sessionId);
    if (timer) {
      clearTimeout(timer);
      const newTimer = setTimeout(() => {
        this.cleanupSession(sessionId);
      }, this.IDLE_TIMEOUT);
      this.idleTimers.set(sessionId, newTimer);
    }
  }
}

export const shellWebSocketHandler = new ShellWebSocketHandler();
