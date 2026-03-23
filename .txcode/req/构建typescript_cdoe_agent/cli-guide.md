# CLI 模块设计

## 1. CLI 概述

CLI 模块提供命令行交互界面，使用 React + Ink 实现。

---

## 2. 启动模式

```bash
txcode                    # 交互模式
txcode "单次消息"         # 单次对话
txcode web               # 启动 Web 服务
```

---

## 3. 命令行参数

```typescript
// modules/cli/cli.types.ts

export interface CLIOptions {
  command?: 'chat' | 'web' | 'new' | 'list' | 'load' | 'delete' | 'config';
  message?: string;
  sessionId?: string;
  port?: number;
  help?: boolean;
  version?: boolean;
}

// 解析
// txcode "hello"           → { command: 'chat', message: 'hello' }
// txcode --new             → { command: 'new' }
// txcode --list            → { command: 'list' }
// txcode --load abc123     → { command: 'load', sessionId: 'abc123' }
// txcode --delete abc123   → { command: 'delete', sessionId: 'abc123' }
// txcode web               → { command: 'web' }
// txcode web --port 3000   → { command: 'web', port: 3000 }
```

---

## 4. CLI 组件结构

```
components/
├── App.tsx              # 根组件
├── Chat.tsx            # 主聊天界面
├── Input.tsx           # 输入框组件
├── StatusBar.tsx       # 状态栏
├── MessageList.tsx      # 消息列表
├── Message.tsx          # 单条消息
├── CodeBlock.tsx       # 代码块渲染
├── Spinner.tsx          # 加载动画
├── Welcome.tsx         # 欢迎页面
└── Config.tsx          # 配置页面
```

---

## 5. 核心组件实现

### 5.1 App.tsx

```tsx
// components/App.tsx

import React, { useState, useEffect } from 'react';
import { Box } from 'ink';
import { Chat } from './Chat';
import { StatusBar } from './StatusBar';
import { Welcome } from './Welcome';
import { Config } from './Config';
import { useSession } from '../hooks/useSession';
import { useAI } from '../hooks/useAI';

type Mode = 'welcome' | 'chat' | 'config';

export const App: React.FC = () => {
  const [mode, setMode] = useState<Mode>('welcome');
  const [projectPath, setProjectPath] = useState<string>(process.cwd());
  const { session, createSession, setSession, listSessions } = useSession();
  const { sendMessage, streaming, messages } = useAI();

  useEffect(() => {
    // 初始化：创建或加载会话
    const init = async () => {
      const sessions = await listSessions();
      if (sessions.length > 0) {
        setSession(sessions[0].id);
        setMode('chat');
      }
    };
    init();
  }, []);

  const handleNewSession = async () => {
    const newSession = await createSession(undefined, projectPath);
    setSession(newSession.id);
    setMode('chat');
  };

  const handleMessage = async (content: string) => {
    await sendMessage(content, session!.id);
  };

  if (mode === 'config') {
    return <Config onBack={() => setMode('chat')} />;
  }

  if (mode === 'welcome' || !session) {
    return (
      <Welcome
        projectPath={projectPath}
        onStart={handleNewSession}
        onOpenConfig={() => setMode('config')}
      />
    );
  }

  return (
    <Box flexDirection="column" height={100}>
      <StatusBar
        session={session}
        projectPath={projectPath}
        onNewSession={handleNewSession}
        onOpenConfig={() => setMode('config')}
      />
      <Chat
        messages={messages}
        onSend={handleMessage}
        streaming={streaming}
      />
    </Box>
  );
};
```

### 5.2 Chat.tsx

```tsx
// components/Chat.tsx

import React, { useState, useRef } from 'react';
import { Box, Text, Spinner } from 'ink';
import { MessageList } from './MessageList';
import { Input } from './Input';

interface ChatProps {
  messages: ChatMessage[];
  onSend: (content: string) => void;
  streaming: boolean;
}

interface ChatMessage {
  id: number;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: string;
}

export const Chat: React.FC<ChatProps> = ({ messages, onSend, streaming }) => {
  const [input, setInput] = useState('');
  const inputRef = useRef<any>(null);

  const handleSubmit = () => {
    if (!input.trim() || streaming) return;
    onSend(input);
    setInput('');
  };

  const handleKeyDown = (e: any) => {
    if (e.key === 'enter' && !e.shiftKey) {
      handleSubmit();
    }
  };

  return (
    <Box flexDirection="column" flexGrow={1}>
      <MessageList messages={messages} flexGrow={1} />
      
      <Box borderStyle="round" paddingX={1}>
        {streaming && <Spinner type="dots" />}
        <Input
          value={input}
          onChange={setInput}
          onSubmit={handleSubmit}
          onKeyDown={handleKeyDown}
          placeholder={streaming ? '等待回复...' : '输入消息 (Enter 发送, Shift+Enter 换行)'}
          disabled={streaming}
        />
      </Box>
    </Box>
  );
};
```

### 5.3 Input.tsx

```tsx
// components/Input.tsx

import React, { useRef, useEffect } from 'react';
import { Text } from 'ink';
import { useInput } from '../hooks/useInput';

interface InputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onKeyDown?: (e: any) => void;
  placeholder?: string;
  disabled?: boolean;
}

export const Input: React.FC<InputProps> = ({
  value,
  onChange,
  onSubmit,
  onKeyDown,
  placeholder,
  disabled,
}) => {
  const handleInput = useInput((input) => {
    if (disabled) return;
    onChange(input);
  });

  useInput((input, key) => {
    if (disabled) return;
    
    if (key.return) {
      onSubmit();
    } else if (key.backspace || key.delete) {
      onChange(value.slice(0, -1));
    } else if (onKeyDown) {
      onKeyDown(key);
    }
  });

  return (
    <Text>
      <Text color={disabled ? 'gray' : 'cyan'}>{'> '}</Text>
      <Text>{value || (placeholder ? <Text color="gray">{placeholder}</Text> : '')}</Text>
    </Text>
  );
};
```

### 5.4 StatusBar.tsx

```tsx
// components/StatusBar.tsx

import React from 'react';
import { Box, Text } from 'ink';

interface StatusBarProps {
  session: { id: string; title: string };
  projectPath: string;
  onNewSession: () => void;
  onOpenConfig: () => void;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  session,
  projectPath,
  onNewSession,
  onOpenConfig,
}) => {
  return (
    <Box flexDirection="row" justifyContent="space-between" paddingX={1}>
      <Text>
        <Text color="green">txcode</Text>
        <Text color="gray"> | </Text>
        <Text color="yellow">{session.title}</Text>
      </Text>
      
      <Box>
        <Text
          color="cyan"
          onPress={onNewSession}
        >
          + 新会话
        </Text>
        <Text color="gray"> | </Text>
        <Text
          color="cyan"
          onPress={onOpenConfig}
        >
          ⚙ 配置
        </Text>
      </Box>
    </Box>
  );
};
```

---

## 6. Hooks

### 6.1 useInput

```typescript
// hooks/useInput.ts

import { useInput as inkUseInput } from 'ink';

export function useInput(
  handler: (input: string, key: any) => void
) {
  inkUseInput(handler);
}
```

### 6.2 useSession

```typescript
// hooks/useSession.ts

import { useState, useCallback } from 'react';
import { sessionApi } from '../api/session.api';
import { Session } from '../modules/session/session.types';

export function useSession() {
  const [session, setSession] = useState<Session | undefined>();
  const [sessions, setSessions] = useState<Session[]>([]);

  const createSession = useCallback(async (title?: string, projectPath?: string) => {
    const newSession = await sessionApi.create(title, projectPath);
    setSession(newSession);
    return newSession;
  }, []);

  const setCurrentSession = useCallback(async (id: string) => {
    const loadedSession = await sessionApi.getCurrent(id);
    setSession(loadedSession);
    return loadedSession;
  }, []);

  const listSessions = useCallback(async () => {
    const list = await sessionApi.list();
    setSessions(list);
    return list;
  }, []);

  return {
    session,
    sessions,
    createSession,
    setSession: setCurrentSession,
    listSessions,
  };
}
```

### 6.3 useAI

```typescript
// hooks/useAI.ts

import { useState, useCallback } from 'react';
import { aiApi } from '../api/ai.api';
import { memoryApi } from '../api/memory.api';
import { ChatMessage } from '../modules/ai/ai.types';

export function useAI() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState(false);

  const sendMessage = useCallback(async (content: string, sessionId: string) => {
    setStreaming(true);
    
    const userMessage: ChatMessage = { role: 'user', content, createdAt: new Date().toISOString() };
    setMessages(prev => [...prev, userMessage]);
    
    try {
      await memoryApi.addMessage(sessionId, 'user', content);
      const history = await memoryApi.getMessages(sessionId);
      
      await aiApi.chatStream(
        history,
        {},
        (chunk) => {
          // 处理流式输出
        }
      );
    } finally {
      setStreaming(false);
    }
  }, []);

  return { messages, sendMessage, streaming };
}
```

---

## 7. CLI 入口

```typescript
// cli/index.ts

#!/usr/bin/env node

import React from 'react';
import { render } from 'ink';
import { App } from '../components/App';
import { parseArgs } from './args';

async function main() {
  const options = parseArgs(process.argv);

  if (options.help) {
    console.log(`
txcode - AI Coding Assistant

用法:
  txcode [选项] [消息]

选项:
  --new           创建新会话
  --list          列出会话
  --load <id>     加载指定会话
  --delete <id>   删除会话
  web [--port]    启动 Web 服务
  --help          显示帮助
  --version       显示版本
`);
    process.exit(0);
  }

  if (options.version) {
    console.log('txcode v0.1.0');
    process.exit(0);
  }

  // 渲染 CLI 应用
  const { unmount } = render(<App />);
  
  // 保持运行
  process.on('SIGINT', () => {
    unmount();
    process.exit(0);
  });
}

main().catch(console.error);
```

---

## 8. CLI 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Enter` | 发送消息 |
| `Shift+Enter` | 换行 |
| `Ctrl+C` | 取消/退出 |
| `Ctrl+L` | 清屏 |
| `Ctrl+N` | 新会话 |
| `Escape` | 取消输入 |

---

## 9. 输出样式

```tsx
// 彩色输出示例

<Text>                              // 默认白色
<Text bold>粗体</Text>
<Text italic>斜体</Text>
<Text strikethrough>删除线</Text>
<Text underline>下划线</Text>

<Text color="red">红色</Text>
<Text color="green">绿色</Text>
<Text color="cyan">青色</Text>
<Text color="yellow">黄色</Text>
<Text color="magenta">品红</Text>
<Text color="gray">灰色</Text>

<Text backgroundColor="black" color="white">反色</Text>
```

---

## 10. 交互流程

```
txcode 启动
    │
    ▼
┌─────────────────┐
│   Welcome       │  → 首次使用
│   或 Chat       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   StatusBar     │  显示会话信息
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Chat Area     │  显示消息历史
│                 │  消息输入框
└────────┬────────┘
         │
         ▼
    用户输入消息
         │
         ▼
┌─────────────────┐
│  ReAct Agent    │  AI 处理
│  + Tools        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   显示结果      │  流式输出
└─────────────────┘
```
