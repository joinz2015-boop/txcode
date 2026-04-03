# 命令介绍

txCode CLI 模式下支持多种命令，以 `/` 开头。以下是所有可用命令的说明。

## 会话管理

### /new [标题]
创建新会话并切换到该会话。如果不提供标题，默认使用"新会话"。

```
/new                      # 创建会话，标题为"新会话"
/new 我的项目             # 创建会话，标题为"我的项目"
```

### /sessions
列出所有会话，当前会话前面带有 `*` 标记。

```
/sessions
```

### /switch <id>
切换到指定 ID 的会话。

```
/switch abc12345
```

### /delete <id>
删除指定 ID 的会话。

```
/delete abc12345
```

### /clear
清除当前会话的所有消息。

```
/clear
```

## AI 模型

### /providers
列出所有已配置的 AI 服务商。

```
/providers
```

### /models
列出所有可用的模型，按服务商分组显示。

```
/models
```

### /model <id>
切换到指定的模型。

```
/model gpt-4o-abc123
```

## 技能 (Skills)

### /skills
列出所有可用的技能。

```
/skills
```

### /use <名称>
激活指定名称的技能。

```
/use git-release
```

## 上下文管理

### /compact
压缩当前会话的上下文，减少 token 消耗。

```
/compact
```

### /token
显示当前会话的 token 使用统计。

```
/token
```

## 配置

### /config <key=value>
设置配置项。

```
/config maxToolIterations=20
```

## 其他

### /help
显示帮助信息，列出所有可用命令。

```
/help
```

### /exit
退出程序。

```
/exit
```

## 命令速查表

| 命令 | 说明 |
|------|------|
| `/help` | 显示帮助 |
| `/new [标题]` | 创建新会话 |
| `/sessions` | 列出所有会话 |
| `/switch <id>` | 切换会话 |
| `/delete <id>` | 删除会话 |
| `/compact` | 压缩上下文 |
| `/skills` | 列出技能 |
| `/use <名称>` | 使用技能 |
| `/providers` | 列出服务商 |
| `/models` | 列出模型 |
| `/model <id>` | 切换模型 |
| `/token` | Token 统计 |
| `/config <k=v>` | 设置配置 |
| `/clear` | 清除会话 |
| `/exit` | 退出程序 |
