/**
 * Code WebSocket 处理器
 * 
 * 处理 /ws/code 路径的 WebSocket 消息
 * 所有消息广播给所有连接的客户端，前端根据 sessionId 决定是否显示
 */

import { WebSocket } from 'ws';
import { sessionService } from '../../modules/session/index.js';
import { codeChatService } from '../../services/codeChat/index.js';
import { commandChatService } from '../../services/commandChat/index.js';

export class CodeWebSocketHandler {
  private wsClients: Set<WebSocket> = new Set();
  private abortControllers: Map<string, AbortController> = new Map();

  handle(ws: WebSocket): void {
    this.wsClients.add(ws);
    ws.send(JSON.stringify({ type: 'connected', message: 'WebSocket connected' }));

    ws.on('message', async (data: Buffer) => {
      try {
        const msg = JSON.parse(data.toString());
        await this.handleMessage(ws, msg);
      } catch (e) {
        ws.send(JSON.stringify({ type: 'error', error: 'Invalid message format' }));
      }
    });

    ws.on('close', () => {
      this.wsClients.delete(ws);
    });
  }

  private broadcast(message: any): void {
    const data = JSON.stringify(message);
    for (const client of this.wsClients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    }
  }

  private async handleMessage(ws: WebSocket, msg: any): Promise<void> {
    const { type, data } = msg;

    switch (type) {
      case 'chat':
        await this.handleChat(data);
        break;
      case 'stop':
        this.handleStop(data);
        break;
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong' }));
        break;
      default:
        ws.send(JSON.stringify({ type: 'error', error: 'Unknown message type' }));
    }
  }

  private handleStop(data: any): void {
    const { sessionId } = data;
    if (!sessionId) return;

    const controller = this.abortControllers.get(sessionId);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(sessionId);
      sessionService.setIdle(sessionId);
    }
  }

  private async handleChat(data: any): Promise<void> {
    const { message, sessionId, projectPath } = data;

    const existingController = this.abortControllers.get(sessionId);
    if (existingController) {
      existingController.abort();
    }

    const abortController = new AbortController();
    this.abortControllers.set(sessionId, abortController);

    try {
      let session = sessionId ? sessionService.get(sessionId) : null;
      if (!session) {
        session = sessionService.create('New Chat', projectPath);
      }
      sessionService.switchTo(session.id);
      sessionService.setProcessing(session.id);

      this.broadcast({ type: 'session', data: { sessionId: session.id } });

      console.log('[CodeWebSocket] Chat message:', message);

      if (message.trim().startsWith('/')) {
        const result = await commandChatService.handleCommand({
          message,
          sessionId: session.id,
        });

        this.broadcast({ type: 'command', data: result });
        this.broadcast({
          type: 'done',
          data: {
            sessionId: session.id,
            response: result.answer,
            success: result.success,
            commandData: result.data,
          }
        });
        sessionService.setCompleted(session.id);
        return;
      } else {
        const result = await codeChatService.handleChat({
          message,
          sessionId: session.id,
          projectPath: session.projectPath ?? undefined,
          abortSignal: abortController.signal,
          onStep: (step: any, iteration: number, usage?: any) => {
            this.broadcast({ type: 'step', data: { ...step, iteration, usage: usage ? {
              promptTokens: usage.promptTokens,
              completionTokens: usage.completionTokens,
              totalTokens: usage.totalTokens,
            } : undefined } });
          },
          onCompact: (info: { beforeTokens: number; afterTokens: number; summary?: string }) => {
            this.broadcast({ type: 'compact', data: info });
          },
        });

        this.broadcast({
          type: 'done',
          data: {
            sessionId: session.id,
            response: result.answer,
            iterations: result.iterations,
            success: result.success,
            usage: result.usage ? {
              promptTokens: result.usage.promptTokens,
              completionTokens: result.usage.completionTokens,
              totalTokens: result.usage.totalTokens,
            } : undefined,
          }
        });
        sessionService.setCompleted(session.id);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      const isAbort = error instanceof Error && (
        error.name === 'AbortError' ||
        errorMsg === 'ABORTED' ||
        errorMsg.toLowerCase().includes('abort')
      );
      if (isAbort) {
        this.broadcast({ type: 'stopped', sessionId, reason: 'user_cancelled' });
      } else {
        this.broadcast({ type: 'error', sessionId, error: errorMsg });
      }
      sessionService.setIdle(sessionId);
    } finally {
      this.abortControllers.delete(sessionId);
    }
  }
}

export const codeWebSocketHandler = new CodeWebSocketHandler();
