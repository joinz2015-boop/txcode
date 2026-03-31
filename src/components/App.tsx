import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useStdout, Static, useApp } from 'ink';
import { Header } from './Header.js';
import { InputArea } from './InputArea.js';
import { MessageList } from './MessageList.js';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import { sessionService } from '../modules/session/index.js';
import { memoryService } from '../modules/memory/index.js';
import { configService } from '../modules/config/index.js';
import { codeChatService } from '../services/codeChat/index.js';
import { commandChatService } from '../services/commandChat/index.js';

interface Message {
	id: string;
	content: string;
	role: 'user' | 'assistant' | 'system' | 'tool';
	timestamp: Date;
}

interface FileInfo {
	name: string;
	path: string;
	isDirectory?: boolean;
}

const HEADER_KEY = 'header-static-key';

export function App() {
	const { stdout } = useStdout();
	const { exit } = useApp();
	const [messages, setMessages] = useState<Message[]>([]);
	const [remountKey, setRemountKey] = useState(0);
	const [status, setStatus] = useState<'idle' | 'thinking' | 'stopping'>('idle');
	const [currentSession, setCurrentSession] = useState<string | null>(null);
	const [currentModelName, setCurrentModelName] = useState<string>('deepseek-chat');
	const [tokenStats, setTokenStats] = useState({ promptTokens: 0, completionTokens: 0, totalTokens: 0 });

	const [fileSelectMode, setFileSelectMode] = useState(false);
	const [currentDir, setCurrentDir] = useState('');
	const [baseDir, setBaseDir] = useState('');
	const [fileList, setFileList] = useState<FileInfo[]>([]);
	const [selectedIndex, setSelectedIndex] = useState(0);

	const [modelSelectMode, setModelSelectMode] = useState(false);
	const [modelList, setModelList] = useState<{id: string; name: string}[]>([]);
	const [modelSelectedIndex, setModelSelectedIndex] = useState(0);

	const abortControllerRef = React.useRef<AbortController | null>(null);
	const inputRef = React.useRef<{ input: string; cursorPosition: number; setInput: (v: string) => void; setCursorPosition: (v: number) => void }>({ 
		input: '', cursorPosition: 0, setInput: () => {}, setCursorPosition: () => {} 
	});

	const terminalHeight = stdout.rows || 24;
	const headerHeight = 10;
	const inputHeight = 3;
	const contentHeight = terminalHeight - headerHeight - inputHeight;

	useEffect(() => {
		const onResize = () => {
			setRemountKey(prev => prev + 1);
		};
		stdout.on('resize', onResize);
		return () => { stdout.off('resize', onResize); };
	}, [stdout]);
  const items = [
		{ id: HEADER_KEY, isHeader: true },
		...messages.map(m => ({ id: m.id, isHeader: false, content: m.content }))
	];

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

		const defaultModel = configService.get<string>('defaultModel');
		if (defaultModel) {
			setCurrentModelName(defaultModel);
		}
	}, []);

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
			const providers = configService.getProviders();
			const models: {id: string; name: string}[] = [];
			
			for (const provider of providers) {
				const providerModels = configService.getModels(provider.id);
				for (const m of providerModels) {
					models.push({ id: m.id, name: m.name });
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

	const addMessage = useCallback((role: 'user' | 'assistant' | 'system' | 'tool', content: string) => {
		setMessages(prev => {
			const lastMsg = prev[prev.length - 1];
			if (lastMsg && lastMsg.role === role && lastMsg.content === content) {
				return prev;
			}
			const msg: Message = {
				id: uuidv4(),
				role,
				content,
				timestamp: new Date(),
			};
			const maxMessages = 500;
			const newMessages = [...prev, msg];
			if (newMessages.length > maxMessages) {
				return newMessages.slice(-maxMessages);
			}
			return newMessages;
		});
	}, []);

	const handleSubmit = useCallback(async (inputText: string) => {
		const trimmedInput = inputText.trim();
		if (!trimmedInput || status === 'thinking') {
			return;
		}

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
				addMessage('system', `命令执行异常: ${err instanceof Error ? err.message : String(err)}`);
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
				onStep: (step: any, iteration: number, usage?: any) => {
					if (usage?.promptTokens) {
						setTokenStats(prev => ({ ...prev, promptTokens: usage.promptTokens }));
					}
					
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
					};

					const toolCalls = step.toolCalls || [];
					for (const tc of toolCalls) {
						const name = tc.function.name;
						const actionName = actionNames[name] || name;
						
						let stepInfo = `🔧 ${actionName}`;
						
						if (tc.function.arguments) {
							try {
								const inputObj = typeof tc.function.arguments === 'string' 
									? JSON.parse(tc.function.arguments) 
									: tc.function.arguments;
								if (name === 'read_file') {
									const offset = inputObj.offset ?? 1;
									const limit = inputObj.limit ?? 300;
									stepInfo += `: ${inputObj.file_path} offset:${offset}  limit:${limit}`;
								} else if (name === 'edit_file') {
									stepInfo += `: ${inputObj.file_path}`;
								} else if (name === 'write_file') {
									stepInfo += `: ${inputObj.file_path}`;
								} else if (name === 'execute_bash' || name === 'bash') {
									stepInfo += `: ${inputObj.command?.slice(0, 50)}`;
								} else if (name === 'find_files' || name === 'glob') {
									stepInfo += `: ${inputObj.pattern}`;
								} else if (name === 'grep') {
									stepInfo += `: ${inputObj.pattern}`;
								} else {
									const keys = Object.keys(inputObj).slice(0, 2);
									stepInfo += ': ' + keys.map(k => `${k}: ${String(inputObj[k]).slice(0, 30)}`).join(' ');
								}
							} catch {}
						}
						
						if (step.success === false) {
							addMessage('system', `${stepInfo} ❌`);
						} else {
							addMessage('system', `${stepInfo} ✓`);
						}
					}
				},
				onCompact: (info: { beforeTokens: number; afterTokens: number; summary?: string }) => {
					addMessage('system', `【压缩完成】${info.summary || ''}`);
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
			}
		} catch (err) {
			const errorMsg = err instanceof Error ? err.message : 'Unknown error';
			if (errorMsg === 'ABORTED') {
				addMessage('system', '已停止');
			} else {
				addMessage('system', `错误: ${errorMsg}`);
			}
		} finally {
			abortControllerRef.current = null;
			setStatus('idle');
		}
	}, [status, currentSession, addMessage]);

	const handleEscape = useCallback(() => {
		if (status === 'thinking' && abortControllerRef.current) {
			setStatus('stopping');
			abortControllerRef.current.abort();
		} else if (status === 'idle') {
			exit();
		}
	}, [status, exit]);

	const handleFileSelect = useCallback(() => {
		setFileSelectMode(true);
		loadDirectory(process.cwd(), true);
	}, [loadDirectory]);

	const handleModelSelect = useCallback(() => {
		setModelSelectMode(true);
		loadModels();
	}, [loadModels]);

	const handleFileSelectConfirm = useCallback(() => {
		if (fileList[selectedIndex]) {
			const selected = fileList[selectedIndex];
			if (selected.isDirectory || selected.name === '..') {
				loadDirectory(selected.path);
			} else {
				const fullPath = selected.path;
				const effectiveBaseDir = baseDir || process.cwd();
				let relativePath = path.relative(effectiveBaseDir, fullPath);
				relativePath = relativePath.split(path.sep).join('/');
				
				const currentInput = inputRef.current.input || '';
				const atIndex = currentInput.lastIndexOf('@');
				const newInput = atIndex !== -1 
					? currentInput.slice(0, atIndex + 1) + relativePath + ' '
					: currentInput + relativePath + ' ';
				
				inputRef.current.setInput(newInput);
				inputRef.current.setCursorPosition(newInput.length);
				
				setFileSelectMode(false);
				setFileList([]);
				setBaseDir('');
			}
		}
	}, [fileList, selectedIndex, loadDirectory, baseDir]);

	const handleFileSelectCancel = useCallback(() => {
		setFileSelectMode(false);
		setFileList([]);
		setBaseDir('');
	}, []);

	const handleFileSelectUp = useCallback(() => {
		setSelectedIndex(prev => Math.max(0, prev - 1));
	}, []);

	const handleFileSelectDown = useCallback(() => {
		setSelectedIndex(prev => Math.min(fileList.length - 1, prev + 1));
	}, [fileList]);

	const handleModelSelectConfirm = useCallback(() => {
		if (modelList[modelSelectedIndex]) {
			const modelName = modelList[modelSelectedIndex].name;
			setCurrentModelName(modelName);
			configService.set('defaultModel', modelName);
		}
		setModelSelectMode(false);
		setModelList([]);
	}, [modelList, modelSelectedIndex]);

	const handleModelSelectCancel = useCallback(() => {
		setModelSelectMode(false);
		setModelList([]);
	}, []);

	const handleModelSelectUp = useCallback(() => {
		setModelSelectedIndex(prev => Math.max(0, prev - 1));
	}, []);

	const handleModelSelectDown = useCallback(() => {
		setModelSelectedIndex(prev => Math.min(modelList.length - 1, prev + 1));
	}, [modelList]);

	return (
		<Box flexDirection="column" width={stdout.columns || 80}>
			<MessageList 
				messages={messages}
				status={status}
				currentModelName={currentModelName}
				historyRemountKey={remountKey}
			/>
			<InputArea 
				key={`input-${messages.length}`}
				messages={messages}
				setMessages={setMessages}
				contentHeight={contentHeight}
				status={status}
				currentModelName={currentModelName}
				tokenStats={tokenStats}
				onSubmit={handleSubmit}
				onEscape={handleEscape}
				onFileSelect={handleFileSelect}
				onModelSelect={handleModelSelect}
				fileSelectMode={fileSelectMode}
				modelSelectMode={modelSelectMode}
				fileList={fileList}
				selectedIndex={selectedIndex}
				modelList={modelList}
				modelSelectedIndex={modelSelectedIndex}
				currentDir={currentDir}
				onFileSelectConfirm={handleFileSelectConfirm}
				onFileSelectCancel={handleFileSelectCancel}
				onModelSelectConfirm={handleModelSelectConfirm}
				onModelSelectCancel={handleModelSelectCancel}
				onFileSelectUp={handleFileSelectUp}
				onFileSelectDown={handleFileSelectDown}
				onModelSelectUp={handleModelSelectUp}
				onModelSelectDown={handleModelSelectDown}
				sessionId={currentSession}
				inputRef={inputRef}
			/>
		</Box>
	);
}