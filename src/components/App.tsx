/**
 * App 组件 - 主应用组件
 * 
 * 职责：
 * - 组合所有子组件和 Hooks
 * - 管理应用级别的全局状态（session、model）
 * - 处理初始化逻辑（加载会话、模型配置）
 * - 处理键盘事件（ESC 退出）
 * 
 * 架构设计：
 * - 使用 useChat hook 管理聊天逻辑
 * - 使用 useFileSelect hook 管理文件选择
 * - 使用 useModelSelect hook 管理模型选择
 * - 子组件：Header、MessageList、InputArea
 * 
 * 组件结构：
 * ┌─────────────────────────┐
 * │      Header (Logo)      │
 * ├─────────────────────────┤
 * │    MessageList (消息)   │
 * │         ...             │
 * ├─────────────────────────┤
 * │   InputArea (输入区域)   │
 * │   - 输入框               │
 * │   - 文件/模型选择器      │
 * │   - 状态栏              │
 * └─────────────────────────┘
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Box, useStdout, useApp } from 'ink';
import { Header } from './Header.js';
import { InputArea } from './InputArea.js';
import { MessageList } from './MessageList.js';
import { useChat } from './hooks/useChat.js';
import { useFileSelect } from './hooks/useFileSelect.js';
import { useModelSelect } from './hooks/useModelSelect.js';
import { sessionService } from '../modules/session/index.js';
import { memoryService } from '../modules/memory/index.js';
import { configService } from '../modules/config/index.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Header 静态项的唯一标识
 * 用于消息列表中标识 Header 位置
 */
const HEADER_KEY = 'header-static-key';

/**
 * 主应用组件
 * 
 * 功能：
 * 1. 初始化 - 加载会话和配置
 * 2. 聊天功能 - 通过 useChat 处理
 * 3. 文件选择 - 通过 useFileSelect 处理
 * 4. 模型选择 - 通过 useModelSelect 处理
 * 5. 窗口自适应 - 监听 resize 事件
 * 
 * @returns 主应用 UI
 */
export function App() {
	// ==================== Hooks ====================
	
	/** stdout 用于获取终端尺寸 */
	const { stdout } = useStdout();
	
	/** useApp 提供应用退出功能 */
	const { exit } = useApp();
	
	// ==================== 全局状态 ====================
	
	/** 当前会话 ID */
	const [currentSession, setCurrentSession] = useState<string | null>(null);
	
	/** 当前使用的模型名称 */
	const [currentModelName, setCurrentModelName] = useState<string>('deepseek-chat');
	
	/** 重新挂载 key，用于触发 MessageList 刷新 */
	const [remountKey, setRemountKey] = useState(0);
	
	/**
	 * Input 组件的引用
	 * 用于在文件选择后向输入框插入内容
	 * @property input - 当前输入内容
	 * @property cursorPosition - 光标位置
	 * @property setInput - 设置输入内容的方法
	 * @property setCursorPosition - 设置光标位置的方法
	 */
	const inputRef = useRef<{ input: string; cursorPosition: number; setInput: (v: string) => void; setCursorPosition: (v: number) => void }>({ 
		input: '', cursorPosition: 0, setInput: () => {}, setCursorPosition: () => {} 
	});

	// ==================== 回调处理 ====================

	/**
	 * 会话变化回调
	 * 当聊天中创建新会话或切换会话时触发
	 */
	const handleSessionChange = useCallback((sessionId: string) => {
		setCurrentSession(sessionId);
	}, []);

	/**
	 * 文件选择回调
	 * 当用户选择文件后，将文件路径插入到输入框
	 * 
	 * 处理逻辑：
	 * 1. 如果输入中有 @ 符号，替换 @ 后的内容
	 * 2. 否则在末尾追加文件路径
	 * 3. 更新光标位置到末尾
	 */
	const handleFileSelected = useCallback((relativePath: string) => {
		const currentInput = inputRef.current.input || '';
		const atIndex = currentInput.lastIndexOf('@');
		const newInput = atIndex !== -1 
			? currentInput.slice(0, atIndex + 1) + relativePath + ' '
			: currentInput + relativePath + ' ';
		
		inputRef.current.setInput(newInput);
		inputRef.current.setCursorPosition(newInput.length);
	}, []);

	/**
	 * 模型选择回调
	 * 当用户选择模型后更新状态
	 */
	const handleModelSelected = useCallback((modelName: string) => {
		setCurrentModelName(modelName);
	}, []);

	// ==================== Hook 初始化 ====================

	/** 聊天功能 Hook */
	const chat = useChat({
		sessionId: currentSession,
		onSessionChange: handleSessionChange,
	});

	/** 文件选择 Hook */
	const fileSelect = useFileSelect({
		onFileSelected: handleFileSelected,
	});

	/** 模型选择 Hook */
	const modelSelect = useModelSelect({
		onModelSelected: handleModelSelected,
	});

	// ==================== 布局计算 ====================

	/** 终端高度 */
	const terminalHeight = stdout.rows || 24;
	
	/** Header 区域高度 */
	const headerHeight = 10;
	
	/** 输入区域高度 */
	const inputHeight = 3;
	
	/** 消息列表区域高度 = 终端高度 - Header - 输入区域 */
	const contentHeight = terminalHeight - headerHeight - inputHeight;

	// ==================== 副作用 ====================

	/**
	 * 窗口大小变化监听
	 * 当终端窗口大小改变时，触发重新渲染
	 */
	useEffect(() => {
		const onResize = () => {
			setRemountKey(prev => prev + 1);
		};
		stdout.on('resize', onResize);
		return () => { stdout.off('resize', onResize); };
	}, [stdout]);

	/**
	 * 消息列表项
	 * 包含 Header 和所有消息，用于 MessageList 渲染
	 */
	const items = [
		{ id: HEADER_KEY, isHeader: true },
		...chat.messages.map(m => ({ id: m.id, isHeader: false, content: m.content }))
	];

	/**
	 * 初始化加载
	 * - 从 sessionService 获取当前会话
	 * - 从 memoryService 加载历史消息
	 * - 从 configService 加载默认模型
	 */
	useEffect(() => {
		// 加载当前会话
		const session = sessionService.getCurrent();
		if (session) {
			setCurrentSession(session.id);
			// 加载会话的永久消息
			const msgs = memoryService.getPermanentMessages(session.id);
			chat.setMessages(msgs.map(m => ({
				id: uuidv4(),
				role: m.role as 'user' | 'assistant' | 'system' | 'tool',
				content: m.content,
				timestamp: new Date(m.createdAt),
			})));
		}

		// 加载默认模型配置
		const defaultModel = configService.get<string>('defaultModel');
		if (defaultModel) {
			setCurrentModelName(defaultModel);
		}
	}, []);

	/**
	 * ESC 键处理
	 * - 如果正在思考中，则停止
	 * - 如果处于空闲状态，则退出应用
	 */
	const handleEscape = useCallback(() => {
		if (chat.status === 'thinking') {
			chat.stop();
		} else if (chat.status === 'idle') {
			exit();
		}
	}, [chat.status, chat.stop, exit]);

	/** 打开文件选择器 */
	const handleFileSelect = useCallback(() => {
		fileSelect.open();
	}, [fileSelect]);

	/** 打开模型选择器 */
	const handleModelSelect = useCallback(() => {
		modelSelect.open();
	}, [modelSelect]);

	// ==================== 渲染 ====================

	return (
		<Box flexDirection="column" width={stdout.columns || 80}>
			{/* 消息列表区域 */}
			<MessageList 
				messages={chat.messages}
				status={chat.status}
				currentModelName={currentModelName}
				historyRemountKey={remountKey}
			/>
			
			{/* 输入区域 */}
			<InputArea 
				// 使用消息数量作为 key，强制重新挂载以重置输入状态
				key={`input-${chat.messages.length}`}
				messages={chat.messages}
				setMessages={chat.setMessages}
				contentHeight={contentHeight}
				status={chat.status}
				currentModelName={currentModelName}
				tokenStats={chat.tokenStats}
				onSubmit={chat.handleSubmit}
				onEscape={handleEscape}
				onFileSelect={handleFileSelect}
				onModelSelect={handleModelSelect}
				// 文件选择相关 props
				fileSelectMode={fileSelect.fileSelectMode}
				fileList={fileSelect.fileList}
				selectedIndex={fileSelect.selectedIndex}
				currentDir={fileSelect.currentDir}
				onFileSelectConfirm={fileSelect.confirm}
				onFileSelectCancel={fileSelect.cancel}
				onFileSelectUp={fileSelect.moveUp}
				onFileSelectDown={fileSelect.moveDown}
				// 模型选择相关 props
				modelSelectMode={modelSelect.modelSelectMode}
				modelList={modelSelect.modelList}
				modelSelectedIndex={modelSelect.modelSelectedIndex}
				onModelSelectConfirm={modelSelect.confirm}
				onModelSelectCancel={modelSelect.cancel}
				onModelSelectUp={modelSelect.moveUp}
				onModelSelectDown={modelSelect.moveDown}
				// 其他 props
				sessionId={currentSession}
				inputRef={inputRef}
			/>
		</Box>
	);
}