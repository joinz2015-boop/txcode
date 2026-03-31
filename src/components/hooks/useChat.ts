/**
 * useChat Hook - 聊天功能逻辑管理
 * 
 * 职责：
 * - 管理消息列表状态 (messages)
 * - 管理聊天状态 (idle/thinking/stopping)
 * - 管理 token 统计信息
 * - 处理用户输入提交 (handleSubmit)
 * - 处理聊天中断 (stop)
 * 
 * 使用方式：
 * const chat = useChat({ sessionId, onSessionChange });
 */

import { useState, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { sessionService } from '../../modules/session/index.js';
import { codeChatService } from '../../services/codeChat/index.js';
import { commandChatService } from '../../services/commandChat/index.js';

/**
 * 消息类型定义
 * @property id - 消息唯一标识
 * @property content - 消息内容
 * @property role - 消息角色：user(用户)、assistant(AI)、system(系统)、tool(工具)
 * @property timestamp - 消息时间戳
 */
export interface Message {
	id: string;
	content: string;
	role: 'user' | 'assistant' | 'system' | 'tool';
	timestamp: Date;
}

/**
 * Token 统计信息
 * @property promptTokens - 提示词消耗的 token 数量
 * @property completionTokens - 回复消耗的 token 数量
 * @property totalTokens - 总共消耗的 token 数量
 */
export interface TokenStats {
	promptTokens: number;
	completionTokens: number;
	totalTokens: number;
}

/**
 * 聊天状态类型
 * - idle: 空闲状态，可以接收输入
 * - thinking: AI 正在思考/处理中
 * - stopping: 正在停止 AI 操作
 */
export type Status = 'idle' | 'thinking' | 'stopping';

/**
 * useChat Hook 配置选项
 * @property sessionId - 当前会话 ID
 * @property onSessionChange - 会话变化回调
 */
interface UseChatOptions {
	sessionId: string | null;
	onSessionChange?: (sessionId: string) => void;
}

/**
 * 聊天功能 Hook
 * @param options - 配置选项
 * @returns 聊天相关的状态和方法
 */
export function useChat(options: UseChatOptions) {
	const { sessionId, onSessionChange } = options;
	
	/** 消息列表状态 */
	const [messages, setMessages] = useState<Message[]>([]);
	
	/** 当前聊天状态 */
	const [status, setStatus] = useState<Status>('idle');
	
	/** Token 消耗统计 */
	const [tokenStats, setTokenStats] = useState<TokenStats>({ promptTokens: 0, completionTokens: 0, totalTokens: 0 });
	
	/** AbortController 引用，用于中断 AI 请求 */
	const abortControllerRef = useRef<AbortController | null>(null);

	/**
	 * 添加消息到列表
	 * - 自动过滤连续重复的消息
	 * - 限制最多保存 500 条消息，超出时移除最早的
	 * 
	 * @param role - 消息角色
	 * @param content - 消息内容
	 */
	const addMessage = useCallback((role: Message['role'], content: string) => {
		setMessages(prev => {
			const lastMsg = prev[prev.length - 1];
			// 过滤连续重复消息
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
			// 超过最大消息数时，移除最早的
			if (newMessages.length > maxMessages) {
				return newMessages.slice(-maxMessages);
			}
			return newMessages;
		});
	}, []);

	/**
	 * 停止当前 AI 操作
	 * - 将状态设置为 stopping
	 * - 调用 abortController 中断请求
	 */
	const stop = useCallback(() => {
		if (status === 'thinking' && abortControllerRef.current) {
			setStatus('stopping');
			abortControllerRef.current.abort();
		}
	}, [status]);

	/**
	 * 处理用户提交的内容
	 * 
	 * 处理流程：
	 * 1. 判断是否以 / 开头，如果是则作为命令处理
	 * 2. 否则作为普通聊天消息处理
	 * 3. 调用 codeChatService 或 commandChatService
	 * 4. 通过回调函数处理 AI 响应的每个步骤
	 * 
	 * 命令模式：
	 * - 以 / 开头的输入会被识别为命令
	 * - 通过 commandChatService 处理
	 * - 支持切换会话等操作
	 * 
	 * 聊天模式：
	 * - 普通聊天输入
	 * - 通过 codeChatService 处理
	 * - 支持流式响应和工具调用
	 * - onStep 回调：处理 AI 的每个思考步骤和工具调用
	 * - onCompact 回调：处理上下文压缩完成事件
	 * 
	 * @param inputText - 用户输入的文本
	 */
	const handleSubmit = useCallback(async (inputText: string) => {
		const trimmedInput = inputText.trim();
		// 空输入或正在思考时忽略
		if (!trimmedInput || status === 'thinking') {
			return;
		}

		// 命令模式：以 / 开头
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

		// 将用户消息添加到列表
		addMessage('user', trimmedInput);
		// 设置状态为思考中
		setStatus('thinking');

		// 创建 AbortController 用于中断请求
		abortControllerRef.current = new AbortController();

		try {
			const result = await codeChatService.handleChat({
				message: trimmedInput,
				sessionId: sessionId || undefined,
				abortSignal: abortControllerRef.current.signal,
				
				/**
				 * AI 步骤回调 - 处理每个思考步骤
				 * @param step - AI 执行步骤信息
				 * @param iteration - 当前迭代次数
				 * @param usage - token 使用情况
				 */
				onStep: (step: any, iteration: number, usage?: any) => {
					// 更新 prompt tokens
					if (usage?.promptTokens) {
						setTokenStats(prev => ({ ...prev, promptTokens: usage.promptTokens }));
					}
					
					// 显示 AI 的思考过程
					if (step.thought) {
						const thoughtPreview = step.thought.length > 150 
							? step.thought.slice(0, 150) + '...' 
							: step.thought;
						addMessage('system', `💭 ${thoughtPreview}`);
					}
					
					// 工具名称映射表
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

					// 处理工具调用
					const toolCalls = step.toolCalls || [];
					for (const tc of toolCalls) {
						const name = tc.function.name;
						const actionName = actionNames[name] || name;
						
						let stepInfo = `🔧 ${actionName}`;
						
						// 解析工具参数并生成描述
						if (tc.function.arguments) {
							try {
								const inputObj = typeof tc.function.arguments === 'string' 
									? JSON.parse(tc.function.arguments) 
									: tc.function.arguments;
								
								// 根据不同工具生成对应的描述信息
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
						
						// 显示工具执行结果
						if (step.success === false) {
							addMessage('system', `${stepInfo} ❌`);
						} else {
							addMessage('system', `${stepInfo} ✓`);
						}
					}
				},
				
				/**
				 * 上下文压缩完成回调
				 * @param info - 压缩信息，包含压缩前后的 token 数量和摘要
				 */
				onCompact: (info: { beforeTokens: number; afterTokens: number; summary?: string }) => {
					addMessage('system', `【压缩完成】${info.summary || ''}`);
				},
			});

			// 添加 AI 回复
			if (result.answer) {
				addMessage('assistant', result.answer);
			}
			
			// 更新 token 统计
			if (result.usage) {
				setTokenStats({
					promptTokens: result.usage.promptTokens || 0,
					completionTokens: result.usage.completionTokens || 0,
					totalTokens: result.usage.totalTokens || 0,
				});
			}

			// 更新会话 ID
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
			// 清理状态
			abortControllerRef.current = null;
			setStatus('idle');
		}
	}, [status, sessionId, addMessage, onSessionChange]);

	/**
	 * 返回 Hook 的结果
	 * 包含所有状态和操作方法
	 */
	return {
		messages,           // 消息列表
		setMessages,        // 设置消息列表（用于外部初始化）
		status,             // 当前状态
		tokenStats,         // Token 统计
		addMessage,         // 添加消息方法
		handleSubmit,       // 提交输入方法
		stop,               // 停止方法
	};
}