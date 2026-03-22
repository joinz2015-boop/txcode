import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput, useApp, Static } from 'ink';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import { executeCommand } from '../cli/commands.js';
import { sessionService } from '../modules/session/index.js';
import { memoryService } from '../modules/memory/index.js';
import { aiService } from '../modules/ai/index.js';
import { ReActState } from '../modules/ai/ai.types.js';
import { MessageItem } from '../cli/cli.types.js';

interface FileInfo {
  name: string;
  path: string;
  isDirectory?: boolean;
}

export function App() {
  const { exit } = useApp();

  // ==================== 状态定义 ====================
  const [input, setInput] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [status, setStatus] = useState<'idle' | 'thinking'>('idle');
  const [currentSession, setCurrentSession] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Token 统计
  const [tokenStats, setTokenStats] = useState({
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
  });
  const [compressionPercent, setCompressionPercent] = useState(0);
  const [currentModelName, setCurrentModelName] = useState<string>('deepseek-chat');

  // 文件选择状态
  const [fileSelectMode, setFileSelectMode] = useState(false);
  const [currentDir, setCurrentDir] = useState('');
  const [baseDir, setBaseDir] = useState('');
  const [fileList, setFileList] = useState<FileInfo[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // 模型选择状态
  const [modelSelectMode, setModelSelectMode] = useState(false);
  const [modelList, setModelList] = useState<{id: string; name: string}[]>([]);
  const [modelSelectedIndex, setModelSelectedIndex] = useState(0);

  // 历史输入状态
  const [inputHistory, setInputHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // ==================== 辅助函数 ====================
  const loadDirectory = useCallback((dir: string, resetBaseDir: boolean = false) => {
    try {
      if (!baseDir || resetBaseDir) {
        setBaseDir(dir);
      }
      
      const files: FileInfo[] = [];
      const parentDir = path.dirname(dir);
      if (parentDir !== dir) {
        files.push({ name: '..', path: parentDir, isDirectory: true });
      }
      
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.name === '.' || entry.name === '..') continue;
        const fullPath = path.join(dir, entry.name);
        files.push({
          name: entry.name,
          path: fullPath,
          isDirectory: entry.isDirectory()
        });
      }
      
      files.sort((a, b) => {
        if (a.name === '..') return -1;
        if (b.name === '..') return 1;
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });
      
      setFileList(files.slice(0, 50));
      setCurrentDir(dir);
      setSelectedIndex(0);
    } catch (err) {
      setFileList([]);
    }
  }, [baseDir]);

  const loadModels = useCallback(async () => {
    try {
      const { configService } = await import('../modules/config/index.js');
      const providers = configService.getProviders();
      const models: {id: string; name: string}[] = [];
      
      for (const provider of providers) {
        const providerModels = configService.getModels(provider.id);
        for (const m of providerModels) {
          models.push({ id: m.id, name: `${provider.name}/${m.name}` });
        }
      }
      
      if (models.length === 0) {
        models.push({ id: 'deepseek-chat', name: 'deepseek-chat' });
      }
      
      setModelList(models);
      setModelSelectedIndex(0);
    } catch (err) {
      setModelList([]);
    }
  }, []);

  // ==================== 初始化 ====================
  useEffect(() => {
    const session = sessionService.getCurrent();
    if (session) {
      setCurrentSession(session.id);
      const msgs = memoryService.getPermanentMessages(session.id);
      setMessages(msgs.map(m => ({
        id: uuidv4(),
        role: m.role as 'user' | 'assistant' | 'system' | 'tool',
        content: m.content,
        timestamp: new Date(m.createdAt),
      })));
    }
    
    const loadCurrentModel = async () => {
      try {
        const { configService } = await import('../modules/config/index.js');
        const provider = configService.getDefaultProvider();
        if (provider) {
          setCurrentModelName(provider.name);
        }
      } catch {}
    };
    loadCurrentModel();
  }, []);

  // ==================== 消息管理 ====================
  const addMessage = useCallback((role: 'user' | 'assistant' | 'system' | 'tool', content: string) => {
    const contentKey = `${role}:${content.slice(0, 100)}`;
    setMessages(prev => {
      // 检查最后一条消息是否相同（防重复）
      const lastMsg = prev[prev.length - 1];
      if (lastMsg && lastMsg.role === role && lastMsg.content === content) {
        return prev;
      }
      const msg: MessageItem = {
        id: uuidv4(),
        role,
        content,
        timestamp: new Date(),
      };
      return [...prev, msg];
    });
  }, []);

  // ==================== 核心业务逻辑 ====================
  const handleSubmit = useCallback(async () => {
    if (!input.trim() || status === 'thinking') return;

    const trimmedInput = input.trim();
    setInput('');
    setCursorPosition(0);
    setError(null);

    if (trimmedInput.startsWith('/')) {
      const result = await executeCommand(trimmedInput);
      if (result.message) {
        addMessage('system', result.message);
      }
      if (result.data?.exit) {
        exit();
      }
      if (result.data?.id && result.success) {
        setCurrentSession(result.data.id);
      }
      return;
    }

    addMessage('user', trimmedInput);

    let sessionId = currentSession;
    if (!sessionId) {
      const session = sessionService.create('Chat Session');
      sessionId = session.id;
      setCurrentSession(sessionId);
      sessionService.switchTo(sessionId);
    }

    setStatus('thinking');

    try {
      const result = await aiService.chatWithReAct(trimmedInput, {
        sessionId: sessionId,
        memoryService,
        onStep: (state: ReActState, iteration: number) => {
          if (state.thought) {
            const thoughtPreview = state.thought.length > 150 
              ? state.thought.slice(0, 150) + '...' 
              : state.thought;
            addMessage('system', `💭 ${thoughtPreview}`);
          }
          
          const actionNames: Record<string, string> = {
            'read_file': '读取文件',
            'write_file': '创建文件',
            'edit_file': '编辑文件',
            'execute_bash': '执行命令',
            'find_files': '搜索文件',
            'grep': '搜索内容',
            'glob': '文件匹配',
            'loadSkill': '加载技能',
          };
          const actionName = actionNames[state.action] || state.action;
          
          let stepInfo = `🔧 ${actionName}`;
          
          if (state.actionInput) {
            try {
              const inputObj = typeof state.actionInput === 'string' 
                ? JSON.parse(state.actionInput) 
                : state.actionInput;
              if (state.action === 'read_file') {
                const offset = inputObj.offset ?? 1;
                const limit = inputObj.limit ?? 300;
                stepInfo += `: ${inputObj.file_path} (行${offset}-${offset + limit - 1})`;
              } else if (state.action === 'edit_file') {
                stepInfo += `: ${inputObj.file_path}`;
              } else if (state.action === 'write_file') {
                stepInfo += `: ${inputObj.file_path}`;
              } else if (state.action === 'execute_bash') {
                stepInfo += `: ${inputObj.command?.slice(0, 50)}`;
              } else if (state.action === 'find_files' || state.action === 'glob') {
                stepInfo += `: ${inputObj.pattern}`;
              } else if (state.action === 'grep') {
                stepInfo += `: ${inputObj.pattern}`;
              } else if (state.action === 'loadSkill') {
                stepInfo += `: ${inputObj.skillPath}`;
              }
            } catch {}
          }
          
          if (state.observation) {
            const obsStr = typeof state.observation === 'string' 
              ? state.observation 
              : JSON.stringify(state.observation);
            const isFailed = obsStr.startsWith('错误:') || 
                            obsStr.startsWith('Error:') ||
                            obsStr.includes('未找到') ||
                            obsStr.includes('不存在');
            if (isFailed) {
              addMessage('system', `${stepInfo} ❌`);
            } else {
              addMessage('system', `${stepInfo} ✓`);
            }
          } else {
            addMessage('system', stepInfo);
          }
        },
      });

      if (result.answer) {
        addMessage('assistant', result.answer);
        memoryService.addMessage(sessionId, 'assistant', result.answer, true);
      }
      
      if (result.usage) {
        setTokenStats(prev => ({
          promptTokens: prev.promptTokens + result.usage!.promptTokens,
          completionTokens: prev.completionTokens + result.usage!.completionTokens,
          totalTokens: prev.totalTokens + result.usage!.totalTokens,
        }));
      }
      
      if (sessionId) {
        const stats = memoryService.getSessionStats(sessionId);
        if (stats.totalMessages > 0) {
          const compressPercent = Math.round((stats.compressedCount / stats.totalMessages) * 100);
          setCompressionPercent(compressPercent);
        }
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      addMessage('system', `错误: ${errorMsg}`);
    } finally {
      setStatus('idle');
    }
  }, [input, status, currentSession, addMessage, exit]);

  // ==================== 键盘输入处理 ====================
  useInput((char, key) => {
    if (fileSelectMode) {
      const keyAny = key as any;
      if (keyAny.upArrow) {
        setSelectedIndex(prev => Math.max(0, prev - 1));
      } else if (keyAny.downArrow) {
        setSelectedIndex(prev => Math.min(fileList.length - 1, prev + 1));
      } else if (key.return) {
        if (fileList[selectedIndex]) {
          const selected = fileList[selectedIndex];
          if (selected.isDirectory || selected.name === '..') {
            const newInput = input + selected.name + '/';
            setInput(newInput);
            setCursorPosition(newInput.length);
            loadDirectory(selected.path);
          } else {
            const fullPath = selected.path;
            const effectiveBaseDir = baseDir || process.cwd();
            let relativePath = path.relative(effectiveBaseDir, fullPath);
            relativePath = relativePath.split(path.sep).join('/');
            const atIndex = input.lastIndexOf('@');
            const newInput = atIndex !== -1 
              ? input.slice(0, atIndex + 1) + relativePath + ' '
              : input + relativePath + ' ';
            setInput(newInput);
            setCursorPosition(newInput.length);
            setFileSelectMode(false);
            setFileList([]);
            setBaseDir('');
          }
        }
      } else if (key.escape) {
        setFileSelectMode(false);
        setFileList([]);
        setBaseDir('');
      }
      return;
    }

    if (modelSelectMode) {
      const keyAny = key as any;
      if (keyAny.upArrow) {
        setModelSelectedIndex(prev => Math.max(0, prev - 1));
      } else if (keyAny.downArrow) {
        setModelSelectedIndex(prev => Math.min(modelList.length - 1, prev + 1));
      } else if (key.return) {
        if (modelList[modelSelectedIndex]) {
          setCurrentModelName(modelList[modelSelectedIndex].name);
          addMessage('system', `已切换到模型: ${modelList[modelSelectedIndex].name}`);
        }
        setModelSelectMode(false);
        setModelList([]);
      } else if (key.escape) {
        setModelSelectMode(false);
        setModelList([]);
      }
      return;
    }

    const keyAny = key as any;
    if (keyAny.upArrow) {
      if (inputHistory.length > 0) {
        const newIndex = historyIndex < inputHistory.length - 1 ? historyIndex + 1 : historyIndex;
        setHistoryIndex(newIndex);
        const historyInput = inputHistory[inputHistory.length - 1 - newIndex];
        setInput(historyInput);
        setCursorPosition(historyInput.length);
      }
      return;
    }
    if (keyAny.downArrow) {
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        const historyInput = inputHistory[inputHistory.length - 1 - newIndex];
        setInput(historyInput);
        setCursorPosition(historyInput.length);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInput('');
        setCursorPosition(0);
      }
      return;
    }
    
    if (keyAny.leftArrow) {
      setCursorPosition(prev => Math.max(0, prev - 1));
      return;
    }
    if (keyAny.rightArrow) {
      setCursorPosition(prev => Math.min(input.length, prev + 1));
      return;
    }

    if (key.return) {
      if (input === '/model') {
        setModelSelectMode(true);
        loadModels();
        return;
      }
      if (input.trim()) {
        setInputHistory(prev => [...prev, input]);
        setHistoryIndex(-1);
      }
      handleSubmit();
    } else if (key.backspace || key.delete) {
      if (cursorPosition > 0) {
        const newInput = input.slice(0, cursorPosition - 1) + input.slice(cursorPosition);
        setInput(newInput);
        setCursorPosition(prev => prev - 1);
        setHistoryIndex(-1);
        if ((newInput.endsWith('/') || newInput.endsWith(path.sep)) && newInput.length > 1) {
          const inputPath = newInput.endsWith('//') || newInput.endsWith(path.sep + path.sep) 
            ? newInput.slice(0, -1) 
            : newInput;
          const dirPath = path.isAbsolute(inputPath) ? inputPath : path.resolve(process.cwd(), inputPath);
          setFileSelectMode(true);
          loadDirectory(dirPath);
        }
      }
    } else if (key.escape) {
      exit();
    } else if (char && !key.ctrl && !key.meta) {
      const newInput = input.slice(0, cursorPosition) + char + input.slice(cursorPosition);
      setInput(newInput);
      setCursorPosition(prev => prev + char.length);
      setHistoryIndex(-1);
      if (char === '@') {
        setFileSelectMode(true);
        loadDirectory(process.cwd(), true);
      }
      if (newInput === '/model') {
        setModelSelectMode(true);
        loadModels();
      }
    }
  });

  // ==================== UI 渲染 ====================
  const statusText = status === 'thinking' ? '思考中...' : '就绪';
  const sessionText = currentSession ? `会话: ${currentSession.slice(0, 8)}` : '无会话';

  return (
    <>
      {/* ========== 静态消息区域（最先渲染，不受后续组件影响） ========== */}
      <Static items={messages}>
        {(msg: MessageItem) => (
          <Box key={msg.id} marginBottom={1}>
            <Text bold color={msg.role === 'user' ? 'green' : msg.role === 'assistant' ? 'blue' : 'gray'}>
              [{msg.role}]
            </Text>
            <Text> {msg.content.slice(0, 2000)}{msg.content.length > 2000 ? '...' : ''}</Text>
          </Box>
        )}
      </Static>
      
      {/* ========== 动态区域 ========== */}
      <Box flexDirection="column" padding={1}>
        {/* ========== 思考状态 ========== */}
        {status === 'thinking' && (
          <Box marginY={1}>
            <Text dimColor>AI 正在思考...</Text>
          </Box>
        )}

        {/* ========== 输入框 ========== */}
        <Box borderStyle="single" borderColor="gray" paddingX={1}>
          <Text dimColor>{'> '}</Text>
          <Text>{input.slice(0, cursorPosition)}</Text>
          <Text color="cyan">▋</Text>
          <Text>{input.slice(cursorPosition)}</Text>
        </Box>

        {/* ========== 文件选择列表 ========== */}
        {fileSelectMode && (
          <Box flexDirection="column" marginTop={1} paddingX={1}>
            <Text dimColor>{currentDir || '/'} (↑↓ 选择, Enter 确认, ESC 取消)</Text>
            {fileList.slice(0, 15).map((file, index) => (
              <Box key={file.path}>
                <Text>
                  {index === selectedIndex ? (
                    <Text bold color="green">{`▶ ${file.name}${file.isDirectory ? '/' : ''}`}</Text>
                  ) : (
                    <Text dimColor>{`  ${file.name}${file.isDirectory ? '/' : ''}`}</Text>
                  )}
                </Text>
              </Box>
            ))}
            {fileList.length === 0 && (
              <Text dimColor>空目录...</Text>
            )}
          </Box>
        )}

        {/* ========== 模型选择列表 ========== */}
        {modelSelectMode && (
          <Box flexDirection="column" marginTop={1} paddingX={1}>
            <Text dimColor>选择模型 (↑↓ 选择, Enter 确认, ESC 取消):</Text>
            {modelList.map((model, index) => (
              <Box key={model.id}>
                <Text>
                  {index === modelSelectedIndex ? (
                    <Text bold color="green">{`▶ ${model.name}`}</Text>
                  ) : (
                    <Text dimColor>{`  ${model.name}`}</Text>
                  )}
                </Text>
              </Box>
            ))}
            {modelList.length === 0 && (
              <Text dimColor>未找到模型...</Text>
            )}
          </Box>
        )}

        {/* ========== 底部状态栏 ========== */}
        <Box marginTop={1}>
          <Text dimColor>
            {statusText} | 模型: {currentModelName}
            {tokenStats.totalTokens > 0 && ` | Token: ${tokenStats.totalTokens}`}
            {compressionPercent > 0 && ` | 压缩: ${compressionPercent}%`}
            {' | '}{sessionText}
            {' | /help 帮助 | ESC 退出'}
          </Text>
        </Box>

        {/* ========== 错误提示 ========== */}
        {error && (
          <Box marginTop={1}>
            <Text color="red">错误: {error}</Text>
          </Box>
        )}
      </Box>
    </>
  );
}
