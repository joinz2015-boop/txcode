import { useState, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { sessionService } from '../../modules/session/index.js';
import { codeChatService } from '../../services/codeChat/index.js';
import { commandChatService } from '../../services/commandChat/index.js';

export interface Message {
	id: string;
	content: string;
	role: 'user' | 'assistant' | 'system' | 'tool';
	timestamp: Date;
}

export interface TokenStats {
	promptTokens: number;
	completionTokens: number;
	totalTokens: number;
}

export type Status = 'idle' | 'thinking' | 'stopping';

interface UseChatOptions {
	sessionId: string | null;
	onSessionChange?: (sessionId: string) => void;
}

export function useChat(options: UseChatOptions) {
	const { sessionId, onSessionChange } = options;
	
	const [messages, setMessages] = useState<Message[]>([]);
	const [status, setStatus] = useState<Status>('idle');
	const [tokenStats, setTokenStats] = useState<TokenStats>({ promptTokens: 0, completionTokens: 0, totalTokens: 0 });
	
	const abortControllerRef = useRef<AbortController | null>(null);

	const addMessage = useCallback((role: Message['role'], content: string) => {
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

	const stop = useCallback(() => {
		if (status === 'thinking' && abortControllerRef.current) {
			setStatus('stopping');
			abortControllerRef.current.abort();
		}
	}, [status]);

	const handleSubmit = useCallback(async (inputText: string) => {
		const trimmedInput = inputText.trim();
		if (!trimmedInput || status === 'thinking') {
			return;
		}

		if (trimmedInput.startsWith('/')) {
			try {
				const result = await commandChatService.handleCommand({
					message: trimmedInput,
					sessionId: sessionId || undefined,
				});
				
				if (result.answer) {
					addMessage('system', result.answer);
				}
				if (result.sessionId && result.success) {
					onSessionChange?.(result.sessionId);
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
				sessionId: sessionId || undefined,
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
				onSessionChange?.(result.sessionId);
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
	}, [status, sessionId, addMessage, onSessionChange]);

	return {
		messages,
		setMessages,
		status,
		tokenStats,
		addMessage,
		handleSubmit,
		stop,
	};
}