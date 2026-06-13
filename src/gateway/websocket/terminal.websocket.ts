/**
 * Terminal WebSocket 处理器
 * 
 * 处理 /ws/terminal/{sessionId} 路径的 WebSocket 消息
 */

import { WebSocket } from 'ws';
import { terminalService } from '../../modules/terminal/index.js';

export class TerminalWebSocketHandler {
  handle(ws: WebSocket, sessionId: string): void {
    if (!terminalService.isSessionAlive(sessionId)) {
      ws.send(JSON.stringify({ type: 'error', message: 'Terminal session not found' }));
      ws.close();
      return;
    }

    const platform = terminalService.getPlatform(sessionId);
    ws.send(JSON.stringify({ type: 'platform', data: { platform } }));

    terminalService.setCallbacks(
      sessionId,
      (data: string) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'output', data }));
        }
      },
      (code: number) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'exit', code }));
        }
      }
    );

    ws.on('message', (data: Buffer) => {
      try {
        const msg = JSON.parse(data.toString());
        const { type, data: msgData } = msg;

        switch (type) {
          case 'input':
            terminalService.write(sessionId, msgData);
            break;
          case 'resize':
            terminalService.resize(sessionId, msgData.cols, msgData.rows);
            break;
          case 'close':
            terminalService.deleteSession(sessionId);
            ws.close();
            break;
        }
      } catch (e) {
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
      }
    });

    ws.on('close', () => {
      console.log(`Terminal WebSocket [${sessionId}] closed`);
    });

    ws.on('error', (err) => {
      console.error(`Terminal WebSocket [${sessionId}] error:`, err);
    });
  }
}

export const terminalWebSocketHandler = new TerminalWebSocketHandler();
