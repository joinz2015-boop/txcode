/**
 * App 组件 - CLI 主界面
 * 
 * 这是 TXCode 的核心用户界面组件，基于 Ink 框架构建。
 * 
 * 主要功能：
 * 1. 提供交互式命令行聊天界面
 * 2. 支持用户输入消息和命令（以 / 开头）
 * 3. 显示 AI 回复和历史消息
 * 4. 管理会话状态和记忆
 * 
 * 技术要点：
 * - 使用 Ink 的 useInput 钩子处理键盘输入
 * - 使用 React state 管理界面状态
 * - 通过 sessionService 和 memoryService 持久化数据
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import { executeCommand } from '../cli/commands.js';
import { sessionService } from '../modules/session/index.js';
import { memoryService } from '../modules/memory/index.js';
import { aiService } from '../modules/ai/index.js';
import { ReActState } from '../modules/ai/ai.types.js';
import { MessageItem } from '../cli/cli.types.js';
import { toolService } from '../modules/tools/index.js';

interface FileInfo {
  name: string;
  path: string;
  isDirectory?: boolean;
}

/**
 * App 主组件
 * 
 * 负责渲染整个 CLI 界面并处理用户交互
 */
export function App() {
  // ==================== Hooks 初始化 ====================
  
  /**
   * useApp 提供 exit 方法，用于退出 CLI 应用
   */
  const { exit } = useApp();

  // ==================== 状态定义 ====================
  
  /**
   * 用户当前输入的内容
   * 随用户按键实时更新
   */
  const [input, setInput] = useState('');
  
  /**
   * 光标位置（0 表示在最前面）
   */
  const [cursorPosition, setCursorPosition] = useState(0);
  
  /**
   * 消息列表，包含用户消息和 AI 回复
   * 每条消息包含：id, role, content, timestamp
   */
  const [messages, setMessages] = useState<MessageItem[]>([]);
  
  /**
   * 当前状态：'idle' 空闲 | 'thinking' AI 思考中
   * 用于控制界面显示和防止重复提交
   */
  const [status, setStatus] = useState<'idle' | 'thinking'>('idle');
  
  /**
   * 当前会话 ID
   * 用于关联消息和持久化存储
   * 初始为 null，用户首次输入时自动创建
   */
  const [currentSession, setCurrentSession] = useState<string | null>(null);
  
  /**
   * 当前激活的技能 ID（预留功能）
   * 用于实现特定场景的自动化处理
   */
  const [currentSkill, setCurrentSkill] = useState<string | null>(null);
  
  /**
   * 错误信息，用于显示异常提示
   */
  const [error, setError] = useState<string | null>(null);

  // ==================== Token 统计状态 ====================
  
  /**
   * Token 统计
   */
  const [tokenStats, setTokenStats] = useState({
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
  });
  
  /**
   * 压缩百分比
   */
  const [compressionPercent, setCompressionPercent] = useState(0);
  
  /**
   * 当前模型名称
   */
  const [currentModelName, setCurrentModelName] = useState<string>('deepseek-chat');

  // ==================== 文件选择状态 ====================
  
  /**
   * 文件选择模式
   */
  const [fileSelectMode, setFileSelectMode] = useState(false);
  
  /**
   * 当前目录路径
   */
  const [currentDir, setCurrentDir] = useState('');
  
  /**
   * 文件选择起始目录（base directory）
   */
  const [baseDir, setBaseDir] = useState('');
  
  /**
   * 文件列表（包含目录和文件）
   */
  const [fileList, setFileList] = useState<FileInfo[]>([]);
  
  /**
   * 选中索引
   */
  const [selectedIndex, setSelectedIndex] = useState(0);

  // ==================== 模型选择状态 ====================
  
  /**
   * 模型选择模式
   */
  const [modelSelectMode, setModelSelectMode] = useState(false);
  
  /**
   * 模型列表
   */
  const [modelList, setModelList] = useState<{id: string; name: string}[]>([]);
  
  /**
   * 模型选择索引
   */
  const [modelSelectedIndex, setModelSelectedIndex] = useState(0);

  // ==================== 历史输入状态 ====================
  
  /**
   * 输入历史
   */
  const [inputHistory, setInputHistory] = useState<string[]>([]);
  
  /**
   * 历史索引
   */
  const [historyIndex, setHistoryIndex] = useState(-1);

  /**
   * 加载目录内容
   */
  const loadDirectory = useCallback((dir: string, resetBaseDir: boolean = false) => {
    try {
      // 首次加载或强制重置时设置 baseDir
      if (!baseDir || resetBaseDir) {
        setBaseDir(dir);
      }
      
      const files: FileInfo[] = [];
      
      // 添加父目录选项
      const parentDir = path.dirname(dir);
      if (parentDir !== dir) {
        files.push({ name: '..', path: parentDir, isDirectory: true });
      }
      
      // 读取目录内容
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
      
      // 排序：目录在前，然后按名称排序
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

  /**
   * 加载模型列表
   */
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

  // ==================== 初始化逻辑 ====================
  
  /**
   * 组件挂载时执行初始化
   * 
   * 功能：
   * 1. 获取当前活动会话（如果有）
   * 2. 加载该会话的历史消息
   * 3. 恢复界面状态
   */
  useEffect(() => {
    const session = sessionService.getCurrent();
    if (session) {
      setCurrentSession(session.id);
      // 加载永久存储的消息（is_permanent = true）
      const msgs = memoryService.getPermanentMessages(session.id);
      setMessages(msgs.map(m => ({
        id: uuidv4(),
        role: m.role as 'user' | 'assistant' | 'system' | 'tool',
        content: m.content,
        timestamp: new Date(m.createdAt),
      })));
    }
    
    // 加载当前模型
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
  }, []); // 空依赖数组，只在挂载时执行一次

  // ==================== 辅助函数 ====================
  
  /**
   * 添加消息到界面
   * 
   * @param role - 消息角色：user(用户) | assistant(AI) | system(系统) | tool(工具)
   * @param content - 消息内容
   * @returns 创建的消息对象
   */
  const addMessage = useCallback((role: 'user' | 'assistant' | 'system' | 'tool', content: string) => {
    const msg: MessageItem = {
      id: uuidv4(),
      role,
      content,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, msg]);
    return msg;
  }, []); // 无外部依赖

  // ==================== 核心业务逻辑 ====================
  
  /**
   * 处理用户提交（按 Enter 键）
   * 
   * 流程：
   * 1. 验证输入有效性
   * 2. 判断是命令还是聊天消息
   * 3. 命令：执行命令处理
   * 4. 聊天：创建/获取会话，发送给 AI，显示回复
   */
  const handleSubmit = useCallback(async () => {
    // 空输入或 AI 思考中，忽略
    if (!input.trim() || status === 'thinking') return;

    const trimmedInput = input.trim();
    setInput('');  // 清空输入框
    setCursorPosition(0);  // 重置光标位置
    setError(null);  // 清除之前的错误

    // ---------- 处理命令（以 / 开头）----------
    if (trimmedInput.startsWith('/')) {
      const result = await executeCommand(trimmedInput);
      
      // 显示命令执行结果
      if (result.message) {
        addMessage('system', result.message);
      }
      
      // 退出命令
      if (result.data?.exit) {
        exit();
      }
      
      // 新建会话命令，更新当前会话 ID
      if (result.data?.id && result.success) {
        setCurrentSession(result.data.id);
      }
      
      return;  // 命令处理完毕，直接返回
    }

    // ---------- 处理聊天消息 ----------
    
    // 先在界面显示用户消息
    addMessage('user', trimmedInput);

    // 获取或创建会话 ID
    // 注意：必须用局部变量，因为 React state 更新是异步的
    let sessionId = currentSession;
    if (!sessionId) {
      const session = sessionService.create('Chat Session');
      sessionId = session.id;
      setCurrentSession(sessionId);
      sessionService.switchTo(sessionId);
    }

    // 更新状态为思考中
    setStatus('thinking');

    try {
      // 调用 AI 服务，使用 ReAct 模式处理
      const result = await aiService.chatWithReAct(trimmedInput, {
        sessionId: sessionId,
        memoryService,
        onStep: (state: ReActState, iteration: number) => {
          // 先打印思考过程
          if (state.thought) {
            const thoughtPreview = state.thought.length > 150 
              ? state.thought.slice(0, 150) + '...' 
              : state.thought;
            addMessage('system', `💭 ${thoughtPreview}`);
          }
          
          // 再打印工具调用
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
            // 只有以"错误:"开头才判断为失败，避免文件内容中包含 error 等词被误判
            const isFailed = obsStr.startsWith('错误:') || 
                            obsStr.startsWith('Error:') ||
                            obsStr.startsWith('错误:') ||
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

      // 显示 AI 回复
      if (result.answer) {
        addMessage('assistant', result.answer);
        // 保存 AI 回复到持久化存储
        memoryService.addMessage(sessionId, 'assistant', result.answer, true);
      }
      
      // 更新 Token 统计
      if (result.usage) {
        setTokenStats(prev => ({
          promptTokens: prev.promptTokens + result.usage!.promptTokens,
          completionTokens: prev.completionTokens + result.usage!.completionTokens,
          totalTokens: prev.totalTokens + result.usage!.totalTokens,
        }));
      }
      
      // 更新压缩统计
      if (sessionId) {
        const stats = memoryService.getSessionStats(sessionId);
        if (stats.totalMessages > 0) {
          const compressPercent = Math.round((stats.compressedCount / stats.totalMessages) * 100);
          setCompressionPercent(compressPercent);
        }
      }
    } catch (err) {
      // 错误处理
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      addMessage('system', `错误: ${errorMsg}`);
    } finally {
      // 无论成功失败，都恢复空闲状态
      setStatus('idle');
    }
  }, [input, status, currentSession, addMessage, exit]);

  // ==================== 键盘输入处理 ====================
  
  /**
   * useInput 钩子 - 处理所有键盘输入
   * 
   * @param char - 输入的字符
   * @param key - 按键信息（return, backspace, escape 等）
   */
  useInput((char, key) => {
    // 文件选择模式
    if (fileSelectMode) {
      const keyAny = key as any;
      // 上箭头：选择上一个文件
      if (keyAny.upArrow) {
        setSelectedIndex(prev => Math.max(0, prev - 1));
      }
      // 下箭头：选择下一个文件
      else if (keyAny.downArrow) {
        setSelectedIndex(prev => Math.min(fileList.length - 1, prev + 1));
      }
      // Enter 键：确认选择
      else if (key.return) {
        if (fileList[selectedIndex]) {
          const selected = fileList[selectedIndex];
          if (selected.isDirectory || selected.name === '..') {
            // 目录：导航到该目录
            const newInput = input + selected.name + '/';
            setInput(newInput);
            setCursorPosition(newInput.length);
            loadDirectory(selected.path);
          } else {
            // 文件：计算相对于 baseDir 的路径
            const fullPath = selected.path;
            const effectiveBaseDir = baseDir || process.cwd();
            let relativePath = path.relative(effectiveBaseDir, fullPath);
            relativePath = relativePath.split(path.sep).join('/');
            // 替换 @ 后面的内容，避免重复
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
      }
      // ESC 键：取消选择
      else if (key.escape) {
        setFileSelectMode(false);
        setFileList([]);
        setBaseDir('');
      }
      return;
    }

    // 模型选择模式
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

    // 上箭头：浏览历史输入
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
    // 下箭头：回到最新输入
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
    
    // 左右箭头：移动光标
    if (keyAny.leftArrow) {
      setCursorPosition(prev => Math.max(0, prev - 1));
      return;
    }
    if (keyAny.rightArrow) {
      setCursorPosition(prev => Math.min(input.length, prev + 1));
      return;
    }

    // Enter 键：提交输入
    if (key.return) {
      // /model 命令触发模型选择
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
    } 
    // 退格/删除键：删除光标前一个字符
    else if (key.backspace || key.delete) {
      if (cursorPosition > 0) {
        const newInput = input.slice(0, cursorPosition - 1) + input.slice(cursorPosition);
        setInput(newInput);
        setCursorPosition(prev => prev - 1);
        setHistoryIndex(-1);
        // 如果删掉后以 / 结尾，尝试显示目录内容
        if ((newInput.endsWith('/') || newInput.endsWith(path.sep)) && newInput.length > 1) {
          const inputPath = newInput.endsWith('//') || newInput.endsWith(path.sep + path.sep) 
            ? newInput.slice(0, -1) 
            : newInput;
          const dirPath = path.isAbsolute(inputPath) ? inputPath : path.resolve(process.cwd(), inputPath);
          setFileSelectMode(true);
          loadDirectory(dirPath);
        }
      }
    } 
    // ESC 键：退出应用
    else if (key.escape) {
      exit();
    } 
    // 普通字符：在光标位置插入（忽略 Ctrl/Meta 组合键）
    else if (char && !key.ctrl && !key.meta) {
      const newInput = input.slice(0, cursorPosition) + char + input.slice(cursorPosition);
      setInput(newInput);
      setCursorPosition(prev => prev + char.length);
      setHistoryIndex(-1);
      // 检测 @ 符号触发文件选择
      if (char === '@') {
        setFileSelectMode(true);
        loadDirectory(process.cwd(), true);
      }
      // 检测 /model 触发模型选择
      if (newInput === '/model') {
        setModelSelectMode(true);
        loadModels();
      }
    }
  });

  // ==================== UI 渲染 ====================
  
  // 状态文本显示
  const statusText = status === 'thinking' ? '思考中...' : '就绪';
  // 会话 ID 显示（截取前 8 位）
  const sessionText = currentSession ? `会话: ${currentSession.slice(0, 8)}` : '无会话';
  // Token 显示
  const tokenText = tokenStats.totalTokens > 0 ? `Token: ${tokenStats.totalTokens}` : '';

  return (
    // 最外层容器：垂直布局，四周留白
    <Box flexDirection="column" padding={1}>
      
      {/* ========== 标题栏 ========== */}
      <Box borderStyle="single" borderColor="cyan" paddingX={1}>
        <Text bold color="cyan">TXCode</Text>
        <Text> - AI 编程助手</Text>
        <Box marginLeft={2}>
          <Text dimColor>{sessionText}</Text>
        </Box>
      </Box>

      {/* ========== 消息区域 ========== */}
      <Box flexDirection="column" marginY={1} minHeight={10}>
        {/* 显示最近 10 条消息 */}
        {messages.slice(-10).map(msg => (
          <Box key={msg.id} marginBottom={1}>
            {/* 消息角色标签，不同角色不同颜色 */}
            <Text bold color={msg.role === 'user' ? 'green' : msg.role === 'assistant' ? 'blue' : 'gray'}>
              [{msg.role}]
            </Text>
            {/* 消息内容，超长截断显示 */}
            <Text> {msg.content.slice(0, 2000)}{msg.content.length > 2000 ? '...' : ''}</Text>
          </Box>
        ))}
        {/* AI 思考中的提示 */}
        {status === 'thinking' && (
          <Text dimColor>AI 正在思考...</Text>
        )}
      </Box>

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
          <Text dimColor>{currentDir || '/'} (↑↓ 选择, Enter 确认, ESC 取消, 删空格查看目录)</Text>
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
          {' | 输入消息或命令 | /help 帮助 | ESC 退出'}
        </Text>
      </Box>

      {/* ========== 错误提示 ========== */}
      {error && (
        <Box marginTop={1}>
          <Text color="red">错误: {error}</Text>
        </Box>
      )}
    </Box>
  );
}
