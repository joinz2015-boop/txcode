import { Box, Text, Static, useStdout } from 'ink';
import React, { useMemo } from 'react';
import type { MessageItem } from '../cli/cli.types.js';

interface Props {
  messages: MessageItem[];
  status: 'idle' | 'thinking' | 'stopping';
  currentModelName: string;
  historyRemountKey: number;
}

export function MainContent({ messages, status, currentModelName, historyRemountKey }: Props) {
  const { stdout } = useStdout();
  const terminalWidth = stdout.columns || 80;

  // 限制渲染的消息数量，防止内存溢出
  const visibleMessages = useMemo(() => {
    const maxVisible = 200;
    if (messages.length > maxVisible) {
      return messages.slice(-maxVisible);
    }
    return messages;
  }, [messages]);

  return (
    <Box flexDirection="column" flexGrow={1} flexShrink={1}>
      <Static key={historyRemountKey} items={visibleMessages}>
        {(msg) => <MessageItemView key={msg.id} msg={msg} />}
      </Static>

      {status === 'thinking' && (
        <Box paddingLeft={2}>
          <Text bold color="cyan">▣ Build</Text>
          <Text dimColor> · {currentModelName}</Text>
          <Text dimColor> · 按 ESC 停止...</Text>
        </Box>
      )}

      {status === 'stopping' && (
        <Box paddingLeft={2}>
          <Text bold color="yellow">■ 正在停止...</Text>
        </Box>
      )}
    </Box>
  );
}

function MessageItemView({ msg }: { msg: MessageItem }) {
  const isToolCall = (content: string) => {
    return content.startsWith('🔧') || content.startsWith('✓') || content.startsWith('* ');
  };

  const isThought = (content: string) => {
    return content.startsWith('💭') || content.startsWith('~ ');
  };

  const formatToolCall = (content: string) => {
    if (content.startsWith('🔧 ')) {
      return content.replace('🔧 ', '* ').replace(' ✓', '').replace(' ❌', '');
    }
    return content;
  };

  const formatThought = (content: string) => {
    if (content.startsWith('💭 ')) {
      return content.replace('💭 ', '~ ');
    }
    return content;
  };

  if (msg.role === 'user') {
    return (
      <Box 
        backgroundColor="#121212"
        paddingX={2}
        paddingY={1}
        borderLeft="2"
        borderColor="#27272a"
        marginBottom={1}
      >
        <Text bold color="#f4f4f5"># {msg.content}</Text>
      </Box>
    );
  }

  if (msg.role === 'assistant') {
    let thought = '';
    let toolCalls: any[] = [];
    let success = true;
    
    try {
      const parsed = JSON.parse(msg.content);
      if (parsed.type === 'assistant_with_tools') {
        thought = parsed.thought || '';
        toolCalls = parsed.toolCalls || [];
        success = parsed.success !== false;
      } else {
        thought = msg.content;
      }
    } catch {
      thought = msg.content;
    }
    
    const actionNames: Record<string, string> = {
      'read': '读取文件',
      'read_file': '读取文件',
      'edit_file': '编辑文件',
      'write_file': '写入文件',
      'bash': '执行命令',
      'execute_bash': '执行命令',
      'find_files': '搜索文件',
      'grep': '搜索内容',
      'glob': '文件匹配',
    };
    
    return (
      <Box marginBottom={1} flexDirection="column">
        {thought && (
          <Box paddingLeft={2}>
            <Text bold color="cyan">~ {thought}</Text>
          </Box>
        )}
        {toolCalls.map((tc: any, idx: number) => {
          const name = tc.function?.name || 'unknown';
          const actionName = actionNames[name] || name;
          return (
            <Box key={idx} paddingLeft={2}>
              <Text dimColor>* {actionName} {success ? '✓' : '✗'}</Text>
            </Box>
          );
        })}
        {!thought && toolCalls.length === 0 && (
          <Box paddingLeft={2}>
            <Text color="#d4d4d8">{msg.content}</Text>
          </Box>
        )}
      </Box>
    );
  }

  const isThoughtMsg = msg.role === 'system' && isThought(msg.content);
  const isTool = msg.role === 'system' && isToolCall(msg.content);
  const isError = msg.role === 'system' && msg.content.startsWith('错误:');
  
  if (isThoughtMsg) {
    return (
      <Box marginBottom={1} paddingLeft={2}>
        <Text bold color="cyan">{formatThought(msg.content)}</Text>
      </Box>
    );
  }
  
  if (isTool) {
    return (
      <Box marginBottom={1} paddingLeft={2}>
        <Text dimColor>{formatToolCall(msg.content)}</Text>
      </Box>
    );
  }
  
  if (isError) {
    return (
      <Box marginBottom={1} paddingLeft={2}>
        <Text color="red">{msg.content}</Text>
      </Box>
    );
  }
  
  if (msg.role === 'system') {
    return (
      <Box marginBottom={1} paddingLeft={2}>
        <Text dimColor>{msg.content}</Text>
      </Box>
    );
  }
  
  return null;
}
