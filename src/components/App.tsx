/**
 * App 主组件
 * 
 * 这是 TXCode CLI 模式的主界面组件，使用 Ink (类 React) 库渲染到终端
 * 
 * 核心功能：
 * 1. 用户输入处理 - 接收键盘输入，支持命令和聊天
 * 2. 消息展示 - 显示用户/AI 的聊天消息
 * 3. AI 调用 - 调用 AI 服务处理用户问题
 * 4. 工具调用展示 - 实时显示 AI 的思考和工具调用过程
 * 5. 文件选择 - 支持 @ 符号触发文件选择器
 * 6. 模型选择 - 支持 /model 命令切换 AI 模型
 * 7. 状态显示 - 显示 Token 使用量、压缩比例等
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput, useApp, Static } from 'ink';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import { sessionService } from '../modules/session/index.js';
import { memoryService } from '../modules/memory/index.js';
import { dbService } from '../modules/db/index.js';
import { configService } from '../modules/config/index.js';
import { codeChatService } from '../services/codeChat/index.js';
import { commandChatService } from '../services/commandChat/index.js';
import { MessageItem } from '../cli/cli.types.js';

/**
 * 文件信息接口
 * 用于文件选择器显示文件列表
 */
interface FileInfo {
  name: string;
  path: string;
  isDirectory?: boolean;
}

/**
 * App 主组件函数
 * 
 * 组件状态说明：
 * - input: 用户输入的文本
 * - cursorPosition: 光标位置 (支持光标左右移动)
 * - messages: 聊天消息列表
 * - status: 当前状态 (idle/thinking)
 * - currentSession: 当前会话 ID
 * - error: 错误信息
 * - tokenStats: Token 统计
 * - compressionPercent: 压缩百分比
 * - currentModelName: 当前模型名称
 * - fileSelectMode: 文件选择模式
 * - modelSelectMode: 模型选择模式
 * - inputHistory: 输入历史 (上下键遍历)
 */
export function App() {
  // ========== Hooks ==========
  // useApp() 提供 Ink 应用的上下文，包含 exit() 方法用于退出程序
  const { exit } = useApp();

  // ========== 输入相关状态 ==========
  /** 用户输入的文本 */
  const [input, setInput] = useState('');
  /** 光标在输入框中的位置 */
  const [cursorPosition, setCursorPosition] = useState(0);
  
  // ========== 消息相关状态 ==========
  /** 聊天消息列表 */
  const [messages, setMessages] = useState<MessageItem[]>([]);
  /** 当前状态：idle(空闲) 或 thinking(AI 思考中) 或 stopping(正在停止) */
  const [status, setStatus] = useState<'idle' | 'thinking' | 'stopping'>('idle');
  /** 当前会话 ID */
  const [currentSession, setCurrentSession] = useState<string | null>(null);
  /** 错误信息 */
  const [error, setError] = useState<string | null>(null);

  // ========== 统计相关状态 ==========
  /** Token 统计 */
  const [tokenStats, setTokenStats] = useState({
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
  });
  /** 压缩百分比 */
  const [compressionPercent, setCompressionPercent] = useState(0);
  /** 当前模型名称 */
  const [currentModelName, setCurrentModelName] = useState<string>('deepseek-chat');

  // ========== 文件选择相关状态 ==========
  /** 是否处于文件选择模式 */
  const [fileSelectMode, setFileSelectMode] = useState(false);
  /** 当前目录路径 */
  const [currentDir, setCurrentDir] = useState('');
  /** 基础目录路径 */
  const [baseDir, setBaseDir] = useState('');
  /** 文件列表 */
  const [fileList, setFileList] = useState<FileInfo[]>([]);
  /** 当前选中项索引 */
  const [selectedIndex, setSelectedIndex] = useState(0);

  // ========== 模型选择相关状态 ==========
  /** 是否处于模型选择模式 */
  const [modelSelectMode, setModelSelectMode] = useState(false);
  /** 模型列表 */
  const [modelList, setModelList] = useState<{id: string; name: string}[]>([]);
  /** 当前选中模型索引 */
  const [modelSelectedIndex, setModelSelectedIndex] = useState(0);

  // ========== 输入历史相关状态 ==========
  /** 输入历史记录 */
  const [inputHistory, setInputHistory] = useState<string[]>([]);
  /** 当前历史记录索引 */
  const [historyIndex, setHistoryIndex] = useState(-1);

  // ========== 动画相关状态 ==========
  /** 三点动画字符 */
  const [dotAnimation, setDotAnimation] = useState('');

  // ========== AI 停止控制 ==========
  /** AbortController 用于停止 AI 调用 */
  const abortControllerRef = React.useRef<AbortController | null>(null);

  // ========== 程序退出时保存数据库 ==========
  useEffect(() => {
    const handleExit = () => {
      dbService.close();
    };
    process.on('exit', handleExit);
    process.on('SIGINT', handleExit);
    return () => {
      process.off('exit', handleExit);
      process.off('SIGINT', handleExit);
    };
  }, []);

  // ========== 三点动画效果 ==========
  useEffect(() => {
    if (status === 'thinking') {
      const dots = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧'];
      let i = 0;
      const interval = setInterval(() => {
        setDotAnimation(dots[i % dots.length]);
        i++;
      }, 150);
      return () => clearInterval(interval);
    } else {
      setDotAnimation('');
    }
  }, [status]);

  // ========== 辅助函数 ==========

  /**
   * 加载目录内容 - 用于文件选择器
   * @param dir - 目录路径
   * @param resetBaseDir - 是否重置基础目录
   */
  const loadDirectory = useCallback((dir: string, resetBaseDir: boolean = false) => {
    try {
      // 设置基础目录 (如果是首次或需要重置)
      if (!baseDir || resetBaseDir) {
        setBaseDir(dir);
      }
      
      const files: FileInfo[] = [];
      // 添加父目录选项 (..)
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
   * 加载可用模型列表 - 从配置服务获取所有可用的 AI 模型
   */
  const loadModels = useCallback(async () => {
    try {
      const { configService } = await import('../modules/config/index.js');
      const providers = configService.getProviders();
      const models: {id: string; name: string}[] = [];
      
      // 遍历所有提供商，获取其模型列表
      for (const provider of providers) {
        const providerModels = configService.getModels(provider.id);
        for (const m of providerModels) {
          models.push({ id: m.id, name: m.name });
        }
      }
      
      // 如果没有模型，添加默认模型
      if (models.length === 0) {
        models.push({ id: 'deepseek-chat', name: 'deepseek-chat' });
      }
      
      setModelList(models);
      setModelSelectedIndex(0);
    } catch (err) {
      setModelList([]);
    }
  }, []);

  // ========== 初始化 ==========
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
    
    const loadCurrentModel = () => {
      const defaultModel = configService.get<string>('defaultModel');
      //console.log('[DEBUG] loadCurrentModel - defaultModel from config:', defaultModel);
      if (defaultModel) {
        setCurrentModelName(defaultModel);
       // console.log('[DEBUG] setCurrentModelName to:', defaultModel);
      }
    };
    loadCurrentModel();
  }, []);

  // ========== 消息管理 ==========

  /**
   * 添加消息到列表 - 防止重复添加相同的消息
   * @param role - 消息角色
   * @param content - 消息内容
   */
  const addMessage = useCallback((role: 'user' | 'assistant' | 'system' | 'tool', content: string) => {
    const contentKey = `${role}:${content.slice(0, 100)}`;
    setMessages(prev => {
      // 检查最后一条消息是否相同 (防重复)
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

  // ========== 核心业务逻辑 ==========

  /**
   * 提交用户输入 - 处理流程：
   * 1. 检查输入是否有效
   * 2. 如果是命令 (/开头)，执行命令
   * 3. 否则调用 AI 服务处理
   * 4. 更新 UI 和状态
   * 
   * 🔍 排查 /help 命令无反应的思路：
   * - 确认 handleSubmit 是否被调用 (检查 useInput 中 key.return 分支)
   * - 确认 trimmedInput.startsWith('/') 返回 true
   * - 确认 executeCommand 返回了正确的 result
   * - 确认 addMessage 被调用并成功添加了消息
   */
  const handleSubmit = useCallback(async () => {
    // 验证输入：不能为空，且当前不在思考中
    if (!input.trim() || status === 'thinking') {
      // 🔍 如果在这里 return，说明 input 为空或正在思考中
      return;
    }

    // ========== 准备输入 ==========
    const trimmedInput = input.trim();
    setInput('');                  // 清空输入框
    setCursorPosition(0);         // 重置光标位置
    setError(null);               // 清空错误

    // ========== 命令处理 ==========
    // 以 / 开头的输入作为命令处理
    if (trimmedInput.startsWith('/')) {
      try {
        const result = await commandChatService.handleCommand({
          message: trimmedInput,
          sessionId: currentSession || undefined,
        });
        
        if (result.answer) {
          addMessage('system', result.answer);
        }
        if (result.sessionId && result.success) {
          setCurrentSession(result.sessionId);
        }
      } catch (err) {
        console.error('[DEBUG] 命令执行异常:', err);
        addMessage('system', `命令执行异常: ${err instanceof Error ? err.message : String(err)}`);
        return;
      }
      return;
    }

    addMessage('user', trimmedInput);

    setStatus('thinking');

    abortControllerRef.current = new AbortController();

    try {
      const result = await codeChatService.handleChat({
        message: trimmedInput,
        sessionId: currentSession || undefined,
        abortSignal: abortControllerRef.current.signal,
        onStep: (step: any, iteration: number) => {
          if (step.thought) {
            const thoughtPreview = step.thought.length > 150 
              ? step.thought.slice(0, 150) + '...' 
              : step.thought;
            addMessage('system', `💭 ${thoughtPreview}`);
          }
          
          const actionNames: Record<string, string> = {
            'read_file': '读取文件',
            'write_file': '创建文件',
            'edit_file': '编辑文件',
            'execute_bash': '执行命令',
            'bash': '执行命令',
            'find_files': '搜索文件',
            'grep': '搜索内容',
            'glob': '文件匹配',
            'loadSkill': '加载技能',
            'todowrite': '任务列表',
            'task': '任务代理',
            'webfetch': '网页获取',
            'question': '提问',
          };

          const actions = step.actions || [];
          for (const action of actions) {
            const actionName = actionNames[action.name] || action.name;
            
            let stepInfo = `🔧 ${actionName}`;
            
            if (action.args) {
              try {
                const inputObj = typeof action.args === 'string' 
                  ? JSON.parse(action.args) 
                  : action.args;
                if (action.name === 'read_file') {
                  const offset = inputObj.offset ?? 1;
                  const limit = inputObj.limit ?? 300;
                  stepInfo += `: ${inputObj.file_path} offset:${offset}  limit:${limit}`;
                } else if (action.name === 'edit_file') {
                  stepInfo += `: ${inputObj.file_path}`;
                } else if (action.name === 'write_file') {
                  stepInfo += `: ${inputObj.file_path}`;
                } else if (action.name === 'execute_bash' || action.name === 'bash') {
                  stepInfo += `: ${inputObj.command?.slice(0, 50)}`;
                } else if (action.name === 'find_files' || action.name === 'glob') {
                  stepInfo += `: ${inputObj.pattern}`;
                } else if (action.name === 'grep') {
                  stepInfo += `: ${inputObj.pattern}`;
                } else if (action.name === 'loadSkill') {
                  stepInfo += `: ${inputObj.skillPath}`;
                } else if (action.name === 'webfetch') {
                  stepInfo += `: ${inputObj.url?.slice(0, 50)}`;
                } else if (action.name === 'todowrite') {
                  if (inputObj.todos && Array.isArray(inputObj.todos)) {
                    stepInfo += `: ${inputObj.todos.length} 个任务`;
                  }
                } else if (action.name === 'question') {
                  stepInfo += `: ${inputObj.questions?.length || 0} 个问题`;
                } else {
                  const keys = Object.keys(inputObj);
                  if (keys.length > 0) {
                    const firstKey = keys[0];
                    const val = inputObj[firstKey];
                    if (typeof val === 'string') {
                      stepInfo += `: ${val.slice(0, 50)}`;
                    } else if (typeof val === 'number') {
                      stepInfo += `: ${val}`;
                    }
                  }
                }
              } catch {}
            }
            
            if (step.observation) {
              const obsStr = typeof step.observation === 'string' 
                ? step.observation 
                : JSON.stringify(step.observation);
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
          }
          
          if (actions.length === 0 && step.observation) {
            const obsStr = typeof step.observation === 'string' 
              ? step.observation 
              : JSON.stringify(step.observation);
            const isFailed = obsStr.startsWith('错误:') || 
                            obsStr.startsWith('Error:') ||
                            obsStr.includes('未找到') ||
                            obsStr.includes('不存在');
            if (isFailed) {
              addMessage('system', `🔧 工具执行 ❌`);
            } else {
              addMessage('system', `🔧 工具执行 ✓`);
            }
          }
        },
      });

      if (result.answer) {
        addMessage('assistant', result.answer);
      }
      
      if (result.usage) {
        setTokenStats({
          promptTokens: result.usage.promptTokens || 0,
          completionTokens: result.usage.completionTokens || 0,
          totalTokens: result.usage.totalTokens || 0,
        });
      }

      if (result.sessionId) {
        setCurrentSession(result.sessionId);
        const stats = memoryService.getSessionStats(result.sessionId);
        if (stats.totalMessages > 0) {
          const compressPercent = Math.round((stats.compressedCount / stats.totalMessages) * 100);
          setCompressionPercent(compressPercent);
        }
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      if (errorMsg === 'ABORTED') {
        addMessage('system', '已停止');
      } else {
        setError(errorMsg);
        addMessage('system', `错误: ${errorMsg}`);
      }
    } finally {
      abortControllerRef.current = null;
      setStatus('idle');
    }
  }, [input, status, currentSession, addMessage]);

  // ========== 键盘输入处理 ==========

  /**
   * useInput Hook - 处理所有键盘输入事件
   * 根据当前模式 (普通/文件选择/模型选择) 执行不同逻辑
   */
  useInput((char, key) => {
    // ========== 文件选择模式 ==========
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
          const modelName = modelList[modelSelectedIndex].name;
          console.log('[模型切换] 准备保存模型:', modelName);
          setCurrentModelName(modelName);
          configService.set('defaultModel', modelName);
          console.log('[模型切换] 已保存到 config 表');
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

    // 🔍 排查 /help 无反应：确认回车键是否触发 handleSubmit
    if (key.return) {
      // 🔍 断点0: 检查 input 的值
      // console.log('[DEBUG] key.return, input:', JSON.stringify(input));
      
      if (input === '/model') {
        setModelSelectMode(true);
        loadModels();
        return;
      }
      if (input.trim()) {
        setInputHistory(prev => [...prev, input]);
        setHistoryIndex(-1);
      }
      // 🔍 断点1: 确认 handleSubmit 被调用
      // console.log('[DEBUG] 调用 handleSubmit, input:', JSON.stringify(input));
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
      if (status === 'thinking' && abortControllerRef.current) {
        setStatus('stopping');
        abortControllerRef.current.abort();
      } else if (status === 'idle') {
        dbService.close();
        exit();
      }
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

  // ========== UI 渲染 ==========
  
  const sessionText = currentSession ? `${currentSession.slice(0, 8)}` : '无会话';

  const isToolCall = (content: string) => {
    return content.startsWith('🔧') || 
           content.startsWith('✓') ||
           content.startsWith('* ');
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

  return (
    <Box flexDirection="column" padding={1}>
      {/* ========== 日志输出区 ========== */}
      <Box flexDirection="column">
        <Static items={messages}>
          {(msg: MessageItem) => {
            const isError = msg.role === 'system' && msg.content.startsWith('错误:');
            const isTool = msg.role === 'system' && isToolCall(msg.content);
            const isThoughtMsg = msg.role === 'system' && isThought(msg.content);
            
            if (msg.role === 'user') {
              return (
                <Box 
                  key={msg.id} 
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
              return (
                <Box key={msg.id} marginBottom={1} paddingLeft={2}>
                  <Text color="#d4d4d8">{msg.content}</Text>
                </Box>
              );
            }
            
            if (isThoughtMsg) {
              return (
                <Box key={msg.id} marginBottom={1} paddingLeft={2}>
                  <Text bold color="cyan">{formatThought(msg.content)}</Text>
                </Box>
              );
            }
            
            if (isTool) {
              return (
                <Box key={msg.id} marginBottom={1} paddingLeft={2}>
                  <Text dimColor>{formatToolCall(msg.content)}</Text>
                </Box>
              );
            }
            
            if (isError) {
              return (
                <Box key={msg.id} marginBottom={1} paddingLeft={2}>
                  <Text color="red">{msg.content}</Text>
                </Box>
              );
            }
            
            // 显示其他 system 消息（如命令结果）
            if (msg.role === 'system') {
              return (
                <Box key={msg.id} marginBottom={1} paddingLeft={2}>
                  <Text dimColor>{msg.content}</Text>
                </Box>
              );
            }
            
            return null;
          }}
        </Static>

        {/* ========== 思考状态 ========== */}
        {status === 'thinking' && (
          <Box marginBottom={1} paddingLeft={2}>
            <Text bold color="cyan">▣ Build</Text>
            <Text dimColor> · {currentModelName}</Text>
            <Text dimColor> · 按 ESC 停止...</Text>
          </Box>
        )}

        {/* ========== 停止状态 ========== */}
        {status === 'stopping' && (
          <Box marginBottom={1} paddingLeft={2}>
            <Text bold color="yellow">■ 正在停止...</Text>
          </Box>
        )}
      </Box>

      {/* ========== 输入框 ========== */}
      <Box borderStyle="single" borderColor="gray" paddingX={1} marginBottom={1}>
        <Text dimColor>{'> '}</Text>
        <Text>{status === 'stopping' ? '等待停止...' : input.slice(0, cursorPosition)}</Text>
        <Text color="cyan">▋</Text>
        <Text>{status === 'stopping' ? '' : input.slice(cursorPosition)}</Text>
      </Box>

      {/* ========== 文件选择列表 ========== */}
      {fileSelectMode && (
        <Box flexDirection="column" marginBottom={1} paddingX={1}>
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
        <Box flexDirection="column" marginBottom={1} paddingX={1}>
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
      <Box paddingX={2}>
        <Text dimColor>
          {status === 'thinking' ? `${dotAnimation} 思考中` : '✓ 就绪'}
          {` | 模型：${currentModelName}`}
          {` | 会话：${sessionText}`}
          {` | token：(${tokenStats.promptTokens}${tokenStats.promptTokens > 50000 ? ' 会话太大推荐用/compact压缩会话' : ''})`}
          {` | 帮助 /help | 退出 ctrl+c`}
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
