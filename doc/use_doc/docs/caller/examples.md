# 接入示例

## Python 示例

```python
import asyncio
import json
import websockets
from http.server import HTTPServer, BaseHTTPRequestHandler
import threading

# ====== 回调 HTTP 服务器 ======
class ToolHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        length = int(self.headers.get('Content-Length', 0))
        body = json.loads(self.rfile.read(length))
        tool_name = body['toolName']
        args = body['arguments']
        session_id = body['sessionId']

        print(f"收到工具调用: {tool_name}, 参数: {args}")

        # 执行你的业务逻辑
        result = execute_your_tool(tool_name, args)

        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(result).encode())

    def log_message(self, *args):
        pass

def start_server(port=8765):
    server = HTTPServer(('0.0.0.0', port), ToolHandler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    return server

# ====== WebSocket 客户端 ======
async def main():
    # 1. 启动回调服务器
    server = start_server(8765)

    # 2. 连接 txCode
    async with websockets.connect('ws://localhost:40000/ws/caller') as ws:
        # 等待 connected
        msg = json.loads(await ws.recv())
        print(f"连接: {msg['type']}")

        # 3. 初始化
        await ws.send(json.dumps({
            "type": "init",
            "data": {
                "callbackUrl": "http://localhost:8765",
                "projectPath": "/home/user/my-project",
                "title": "Python 接入示例",
                "tools": [{
                    "name": "query_database",
                    "description": "查询数据库",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "sql": { "type": "string", "description": "SQL 语句" }
                        },
                        "required": ["sql"]
                    }
                }]
            }
        }))

        msg = json.loads(await ws.recv())
        if msg['type'] == 'error':
            print(f"init 失败: {msg['error']}")
            return
        session_id = msg['data']['sessionId']
        print(f"sessionId: {session_id}")

        # 4. 发起对话
        await ws.send(json.dumps({
            "type": "chat",
            "data": {
                "sessionId": session_id,
                "message": "查询 users 表的所有数据"
            }
        }))

        # 5. 接收结果
        while True:
            msg = json.loads(await ws.recv())
            t = msg['type']
            if t == 'step':
                d = msg['data']
                print(f"[迭代 {d['iteration']}] 工具: {[tc['function']['name'] for tc in d.get('toolCalls', [])]}")
            elif t == 'done':
                d = msg['data']
                print(f"完成: {d['response'][:100]}")
                break
            elif t == 'error':
                print(f"错误: {msg['error']}")
                break

    server.shutdown()

asyncio.run(main())
```

## Node.js 示例

```javascript
const WebSocket = require('ws');
const express = require('express');

// ====== 回调 HTTP 服务器 ======
const app = express();
app.use(express.json());

app.post('/tool-callback', (req, res) => {
  const { toolName, arguments: args, sessionId } = req.body;
  console.log(`收到工具调用: ${toolName}`, args);

  // 执行你的业务逻辑
  const output = executeYourTool(toolName, args);

  res.json({ success: true, output });
});

app.listen(8765, () => console.log('回调服务器: http://localhost:8765'));

// ====== WebSocket 客户端 ======
const ws = new WebSocket('ws://localhost:40000/ws/caller');

ws.on('open', () => {
  console.log('WebSocket 已连接');
});

ws.on('message', (data) => {
  const msg = JSON.parse(data.toString());
  console.log(`收到: ${msg.type}`);

  switch (msg.type) {
    case 'connected':
      // 发送 init
      ws.send(JSON.stringify({
        type: 'init',
        data: {
          callbackUrl: 'http://localhost:8765/tool-callback',
          projectPath: '/home/user/my-project',
          title: 'Node.js 接入示例',
          tools: [{
            name: 'query_database',
            description: '查询数据库',
            parameters: {
              type: 'object',
              properties: {
                sql: { type: 'string', description: 'SQL 语句' }
              },
              required: ['sql']
            }
          }]
        }
      }));
      break;

    case 'init_ready':
      this.sessionId = msg.data.sessionId;
      // 发送 chat
      ws.send(JSON.stringify({
        type: 'chat',
        data: {
          sessionId: this.sessionId,
          message: '查询 users 表的所有数据'
        }
      }));
      break;

    case 'done':
      console.log(`AI 回复: ${msg.data.response}`);
      break;

    case 'error':
      console.error(`错误: ${msg.error}`);
      break;
  }
});
```

## 多客户端订阅

同一 A 系统的多个前端页面可同时连接 `/ws/caller`，服务端广播所有消息，每个客户端根据 `sessionId` 过滤：

```
客户端A ── connect /ws/caller ──→ 收到 init_ready(sessionId=X)
客户端B ── connect /ws/caller ──→ 收到 connected
客户端A ── chat(sessionId=X) ──→ 收到 step/done(sessionId=X)
客户端B ── 收到 step/done(sessionId=X) ←── 也能收到同样消息
```
