# Caller API — 外部系统对接

Caller API 允许外部系统通过 WebSocket 将 txCode 作为 AI 编码底层服务使用。外部系统在初始化时传入自定义扩展工具，txCode 将扩展工具与内置基础工具合并后提供给 AI。当 AI 调用扩展工具时，txCode 通过 HTTP POST 回调到外部系统执行。

## 架构概览

```
外部系统(A系统) ──WebSocket──→ txCode /ws/caller
      │                            │
      │                            ├── 内置工具 (本地执行)
      │                            │   read/write/edit/bash/glob/grep/web_search/web_fetch
      │                            │
      │                            ├── 扩展工具 (HTTP 回调)
      │                            │   → POST {callbackUrl}
      │←── HTTP 回调 ──────────────┘   ← 返回执行结果
```

## 快速开始

### 1. 建立 WebSocket 连接

```bash
ws://localhost:40000/ws/caller
```

### 2. 发送 init 初始化会话

```json
{
  "type": "init",
  "data": {
    "callbackUrl": "https://your-system.com/tool-callback",
    "projectPath": "/home/user/my-project",
    "tools": [
      {
        "name": "query_database",
        "description": "查询数据库",
        "parameters": {
          "type": "object",
          "properties": {
            "sql": { "type": "string", "description": "SQL 语句" }
          },
          "required": ["sql"]
        }
      }
    ],
    "title": "可选会话标题"
  }
}
```

### 3. 接收 init_ready

```json
{
  "type": "init_ready",
  "data": {
    "sessionId": "6dfb7cf7-9416-49b0-aeeb-069df1bdbe95",
    "title": "可选会话标题",
    "toolsCount": 9
  }
}
```

### 4. 发送 chat 开始对话

```json
{
  "type": "chat",
  "data": {
    "sessionId": "6dfb7cf7-9416-49b0-aeeb-069df1bdbe95",
    "message": "帮我查询 users 表的所有数据"
  }
}
```

### 5. 处理 HTTP 回调

当 AI 调用你的扩展工具时，txCode 会向 `callbackUrl` 发送 POST：

```json
// POST {callbackUrl}
{
  "toolName": "query_database",
  "arguments": { "sql": "SELECT * FROM users" },
  "sessionId": "6dfb7cf7-9416-49b0-aeeb-069df1bdbe95"
}
```

你的系统需要返回：

```json
{
  "success": true,
  "output": "查询结果: 42 条记录"
}
```

### 6. 接收对话结果

你会收到 `step`、`tool_call`、`done` 等消息，详细格式参见 [WebSocket 协议](/txcode/caller/protocol.html)。

## 内置工具列表

以下工具始终可用，由 txCode 本地执行：

| 工具 | 说明 |
|------|------|
| `read_file` | 读取文件 |
| `write_file` | 写入文件 |
| `edit_file` | 编辑文件 |
| `bash` | 执行 shell 命令 |
| `glob` | 文件模式匹配 |
| `grep` | 内容搜索 |
| `web_search` | 网络搜索 |
| `web_fetch` | 获取网页内容 |

## 注意事项

- callbackUrl 仅允许 `http://` 或 `https://` 协议
- 扩展工具名不能与内置工具名重复
- 扩展工具 HTTP 调用默认 30 秒超时
- 同一 sessionId 的多个 WebSocket 客户端会收到相同的广播消息
