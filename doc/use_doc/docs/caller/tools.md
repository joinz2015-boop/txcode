# 扩展工具定义

## ExtendedToolDef 类型

```typescript
interface ExtendedToolDef {
  name: string              // 工具名称
  description: string       // 工具描述（给 AI 看）
  parameters: {             // JSON Schema 参数定义
    type: 'object'
    properties: Record<string, {
      type: string          // 参数类型: string / number / boolean
      description: string   // 参数描述
      enum?: string[]       // 可选，枚举值
    }>
    required?: string[]     // 可选，必填参数
  }
}
```

## 内置工具（不可占用）

以下工具名被保留，扩展工具不能使用：

| 工具名 | 说明 |
|--------|------|
| `read_file` | 读取本地文件 |
| `write_file` | 写入本地文件 |
| `edit_file` | 编辑本地文件 |
| `bash` | 执行终端命令 |
| `glob` | 文件模式匹配 |
| `grep` | 文件内容搜索 |
| `web_search` | 网络搜索 |
| `web_fetch` | 网页内容获取 |

## 扩展工具示例

### 简单示例：查询数据库

```json
{
  "name": "query_database",
  "description": "查询数据库，执行 SQL 并返回结果",
  "parameters": {
    "type": "object",
    "properties": {
      "sql": {
        "type": "string",
        "description": "要执行的 SQL 查询语句"
      },
      "db": {
        "type": "string",
        "description": "数据库名称",
        "enum": ["mysql", "postgres", "sqlite"]
      }
    },
    "required": ["sql"]
  }
}
```

### 复杂示例：发送邮件

```json
{
  "name": "send_email",
  "description": "发送邮件给指定收件人",
  "parameters": {
    "type": "object",
    "properties": {
      "to": { "type": "string", "description": "收件人邮箱" },
      "subject": { "type": "string", "description": "邮件主题" },
      "body": { "type": "string", "description": "邮件正文" },
      "cc": { "type": "string", "description": "抄送邮箱（可选）" }
    },
    "required": ["to", "subject", "body"]
  }
}
```

### 复杂示例：部署应用

```json
{
  "name": "deploy_app",
  "description": "部署应用到指定环境",
  "parameters": {
    "type": "object",
    "properties": {
      "env": {
        "type": "string",
        "description": "部署环境",
        "enum": ["staging", "production"]
      },
      "version": { "type": "string", "description": "版本号" },
      "branch": { "type": "string", "description": "Git 分支" }
    },
    "required": ["env", "version"]
  }
}
```

## HTTP 回调协议

### 请求 (txCode → 你的系统)

```http
POST {callbackUrl}
Content-Type: application/json
```

```json
{
  "toolName": "query_database",
  "arguments": {
    "sql": "SELECT * FROM users",
    "db": "mysql"
  },
  "sessionId": "6dfb7cf7-9416-49b0-aeeb-069df1bdbe95"
}
```

### 响应 (你的系统 → txCode)

成功：

```json
{
  "success": true,
  "output": "查询结果: 42 条记录, 3 个字段"
}
```

失败：

```json
{
  "success": false,
  "error": "数据库连接超时"
}
```

### 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `toolName` | string | AI 调用的工具名称 |
| `arguments` | object | AI 传入的参数，与工具定义对应 |
| `sessionId` | string | 会话 ID |

### 超时

- 默认超时：30 秒
- 可通过 init 时传递 `toolTimeout` 配置（毫秒）

## 安全校验

- callbackUrl 仅允许 `http://` 或 `https://` 协议
- 扩展工具名与内置工具名冲突时 init 返回错误
- 每个 WebSocket 连接的 session 独立
