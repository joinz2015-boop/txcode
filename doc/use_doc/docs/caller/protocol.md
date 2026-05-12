# WebSocket 协议

## 连接

```
ws://localhost:40000/ws/caller
```

连接成功后服务端广播：

```json
{ "type": "connected", "message": "WebSocket connected" }
```

## 消息类型一览

| type | 方向 | 说明 |
|------|------|------|
| `init` | C→S | 初始化会话，传入扩展工具和回调URL |
| `chat` | C→S | 发起 AI 对话 |
| `stop` | C→S | 停止当前任务 |
| `ping` | C→S | 保活心跳 |
| `connected` | S→C | 连接成功 |
| `init_ready` | S→C | 初始化完成 |
| `step` | S→C | AI 每一步执行状态 |
| `tool_call` | S→C | 扩展工具被 AI 调用时通知 |
| `compact` | S→C | 上下文压缩通知 |
| `done` | S→C | 对话完成 |
| `error` | S→C | 错误信息 |
| `stopped` | S→C | 任务已停止 |
| `pong` | S→C | 心跳响应 |

## init — 初始化

### 请求 (C→S)

```typescript
{
  type: 'init',
  data: {
    callbackUrl: string          // 必填，扩展工具回调地址
    projectPath: string          // 必填，工作目录（不存在则自动创建）
    tools: ExtendedToolDef[]     // 扩展工具列表
    sessionId?: string           // 可选，指定 sessionId
    title?: string               // 可选，会话标题
    systemPrompt?: string        // 可选，额外系统提示词
    apiUrl?: string              // 可选，AI API 地址
    apiKey?: string              // 可选，AI API Key
    modelName?: string           // 可选，模型名称
    toolTimeout?: number         // 可选，扩展工具超时(ms)，默认30000
  }
}
```

### 常见错误

| 错误信息 | 原因 |
|---------|------|
| `callbackUrl is required` | 未传 callbackUrl |
| `callbackUrl must use http:// or https:// protocol` | 协议不合法 |
| `projectPath is required` | 未传 projectPath |
| `工具名冲突: xxx 是内置工具` | 扩展工具名与内置工具重复 |

## chat — 发起对话

### 请求 (C→S)

```typescript
{
  type: 'chat',
  data: {
    sessionId: string      // 必填
    message: string        // 必填，用户消息
    enableDevLog?: boolean // 可选，启用开发日志
  }
}
```

### 错误

| 错误信息 | 原因 |
|---------|------|
| `sessionId is required` | 未传 sessionId |
| `请先发送 init 初始化会话` | 未 init 就 chat |

## step — 执行步骤

AI 每轮工具调用后广播：

```json
{
  "type": "step",
  "data": {
    "sessionId": "uuid",
    "iteration": 1,
    "thought": "AI 思考内容...",
    "toolCalls": [
      {
        "id": "call_xxx",
        "type": "function",
        "function": {
          "name": "query_database",
          "arguments": "{\"sql\":\"SELECT * FROM users\"}"
        }
      }
    ],
    "results": [
      {
        "name": "query_database",
        "success": true,
        "output": "查询结果: 42 条记录"
      }
    ],
    "usage": {
      "promptTokens": 1500,
      "completionTokens": 200,
      "totalTokens": 1700
    }
  }
}
```

## tool_call — 扩展工具调用

当 AI 调用扩展工具时单独通知：

```json
{
  "type": "tool_call",
  "data": {
    "sessionId": "uuid",
    "toolName": "query_database",
    "arguments": "{\"sql\":\"SELECT * FROM users\"}",
    "iteration": 1
  }
}
```

## done — 对话完成

```json
{
  "type": "done",
  "data": {
    "sessionId": "uuid",
    "response": "AI 最终回复内容",
    "iterations": 2,
    "success": true,
    "usage": {
      "promptTokens": 3000,
      "completionTokens": 500,
      "totalTokens": 3500
    }
  }
}
```

## error — 错误

```json
{
  "type": "error",
  "sessionId": "uuid",
  "error": "错误描述"
}
```

## stop — 停止任务

### 请求 (C→S)

```json
{
  "type": "stop",
  "data": {
    "sessionId": "uuid"
  }
}
```

### 响应 (S→C 广播)

```json
{
  "type": "stopped",
  "sessionId": "uuid",
  "reason": "user_cancelled"
}
```

## ping / pong

客户端每 30 秒发送 ping 保持连接：

```json
{ "type": "ping" }
```

服务端响应：

```json
{ "type": "pong" }
```

## 广播机制

所有 S→C 消息广播给所有 `/ws/caller` 连接的客户端，每条消息携带 `sessionId`。客户端根据 `sessionId` 判断是否属于自己的会话。
