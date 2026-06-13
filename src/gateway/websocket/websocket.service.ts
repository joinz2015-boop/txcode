/**
 * WebSocket 服务模块
 * 
 * 统一管理 WebSocket 连接，根据 URL 路径分发到不同的处理器
 * 
 * 路径映射：
 * - /ws/code -> CodeWebSocketHandler (聊天)
 * - /ws/caller -> CallerWebSocketHandler (外部系统调用)
 * - /ws/terminal/* -> TerminalWebSocketHandler (终端)
 */

import { WebSocketServer, WebSocket } from 'ws';
import * as http from 'http';
import { codeWebSocketHandler } from './code.websocket.js';
import { terminalWebSocketHandler } from './terminal.websocket.js';
import { callerWebSocketHandler } from './caller.websocket.js';

export class WebSocketService {
  private wss: WebSocketServer | null = null;

  initialize(server: http.Server): void {
    this.wss = new WebSocketServer({ noServer: true });

    // 连接事件：根据 URL 路径分发到不同处理器
    this.wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
      const url = req.url || '';

      if (url === '/ws/code' || url.startsWith('/ws/code?')) {
        codeWebSocketHandler.handle(ws);
      } else if (url === '/ws/caller' || url.startsWith('/ws/caller?')) {
        callerWebSocketHandler.handle(ws);
      } else if (url.startsWith('/ws/terminal/')) {
        const sessionId = url.replace('/ws/terminal/', '');
        terminalWebSocketHandler.handle(ws, sessionId);
      } else {
        ws.close();
      }
    });

    // 拦截 HTTP upgrade 请求，交给 ws 库处理 WebSocket 握手
    server.on('upgrade', (req, socket, head) => {
      this.wss?.handleUpgrade(req, socket, head, (ws) => {
        this.wss?.emit('connection', ws, req);
      });
    });
  }

  close(): void {
    this.wss?.close();
  }
}

export const webSocketService = new WebSocketService();
