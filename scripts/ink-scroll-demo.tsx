#!/usr/bin/env node
/**
 * Ink Static 模式 demo：上 Logo / 中历史消息(Static) / 下输入框
 *
 * - 历史消息使用 Ink 的 Static 渲染。
 * - 回车：输入追加到历史区（Static 仅新增这一条）。
 * - q / Esc：退出
 *
 * 运行：npm run demo:ink-scroll
 */

import React, { useEffect, useState } from 'react';
import { Box, Static, Text, render, useApp, useInput, useStdout } from 'ink';

const LOGO_LINES = 6;
const FOOTER_LINES = 3;

interface HistoryItem {
  id: string;
  text: string;
}

export function InkScrollDemoApp() {
  const { exit } = useApp();
  const { stdout } = useStdout();

  const [terminalSize, setTerminalSize] = useState(() => ({
    rows: stdout.rows || 24,
    cols: stdout.columns || 80,
  }));

  useEffect(() => {
    const onResize = () => {
      setTerminalSize({
        rows: stdout.rows || 24,
        cols: stdout.columns || 80,
      });
    };
    stdout.on('resize', onResize);
    return () => {
      stdout.off('resize', onResize);
    };
  }, [stdout]);

  const terminalRows = terminalSize.rows;
  const terminalCols = terminalSize.cols;
  const historyViewportLines = 30;

  const [history, setHistory] = useState<HistoryItem[]>(() => [
    { id: 'boot-1', text: '欢迎使用 Static demo：回车会把输入追加到历史。' },
    { id: 'boot-2', text: '你可以持续输入，观察输入框更新时历史不重绘。' },
  ]);
  const logoStaticItems: HistoryItem[] = [
    { id: 'logo-1', text: '╔══════════════════════════════════╗' },
    { id: 'logo-2', text: '║     INK  LAYOUT  DEMO            ║' },
    { id: 'logo-3', text: '║  Logo / History / Input          ║' },
    { id: 'logo-4', text: '╚══════════════════════════════════╝' },
  ];
  const [input, setInput] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
 
  useInput((chunk, key) => {
    const text = typeof chunk === 'string' ? chunk : '';
    const keyAny = key as { leftArrow?: boolean; rightArrow?: boolean };

    if (key.escape || (text === 'q' && !key.ctrl && !key.meta)) {
      exit();
      return;
    }

    if (key.return) {
      const line = input.trim();
      if (line) {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        setHistory(prev => [...prev, { id, text: line }]);
      }
      setInput('');
      setCursorPosition(0);
      return;
    }

    if (key.backspace || key.delete) {
      if (cursorPosition > 0) {
        const next = input.slice(0, cursorPosition - 1) + input.slice(cursorPosition);
        setInput(next);
        setCursorPosition(c => c - 1);
      }
      return;
    }

    if (keyAny.leftArrow) {
      setCursorPosition(c => Math.max(0, c - 1));
      return;
    }
    if (keyAny.rightArrow) {
      setCursorPosition(c => Math.min(input.length, c + 1));
      return;
    }

    if (text && !key.ctrl && !key.meta) {
      const next = input.slice(0, cursorPosition) + text + input.slice(cursorPosition);
      setInput(next);
      setCursorPosition(cursorPosition + text.length);
    }
  });

  return (
    <Box flexDirection="column" width={terminalCols} height={5}>
      {/* 顶部 Logo */}


      {/* 中间历史（Static） */}
      <Box flexDirection="column" flexGrow={1} minHeight={0}>
         <Static items={logoStaticItems}>
          {item => (
            <Text key={item.id} bold color="cyan">
              {item.text}
            </Text>
          )}
        </Static>
        <Static items={history}>
          {(item, index) => (
            <Text key={item.id}>
              <Text dimColor>{String(index + 1).padStart(3, ' ')}. </Text>
              <Text>{item.text}</Text>
            </Text>
          )}
        </Static>
      </Box>

      {/* 底部输入框 */}
      <Box flexDirection="column" flexShrink={0} marginTop={0}>
        <Box borderStyle="single" borderColor="gray" paddingX={1}>
          <Text dimColor>{'> '}</Text>
          <Text>{input.slice(0, cursorPosition)}</Text>
          <Text color="cyan">▋</Text>
          <Text>{input.slice(cursorPosition)}</Text>
        </Box>
        <Text dimColor>
          Static 历史模式 | 回车追加历史 | q / Esc 退出
        </Text>
      </Box>
    </Box>
  );
}

render(<InkScrollDemoApp />);
