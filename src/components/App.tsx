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

const HEADER_KEY = 'header-static-key';

export function App() {
	const { stdout } = useStdout();
	const { exit } = useApp();
	const [currentSession, setCurrentSession] = useState<string | null>(null);
	const [currentModelName, setCurrentModelName] = useState<string>('deepseek-chat');
	const [remountKey, setRemountKey] = useState(0);
	const inputRef = useRef<{ input: string; cursorPosition: number; setInput: (v: string) => void; setCursorPosition: (v: number) => void }>({ 
		input: '', cursorPosition: 0, setInput: () => {}, setCursorPosition: () => {} 
	});

	const handleSessionChange = useCallback((sessionId: string) => {
		setCurrentSession(sessionId);
	}, []);

	const chat = useChat({
		sessionId: currentSession,
		onSessionChange: handleSessionChange,
	});

	const handleFileSelected = useCallback((relativePath: string) => {
		const currentInput = inputRef.current.input || '';
		const atIndex = currentInput.lastIndexOf('@');
		const newInput = atIndex !== -1 
			? currentInput.slice(0, atIndex + 1) + relativePath + ' '
			: currentInput + relativePath + ' ';
		
		inputRef.current.setInput(newInput);
		inputRef.current.setCursorPosition(newInput.length);
	}, []);

	const fileSelect = useFileSelect({
		onFileSelected: handleFileSelected,
	});

	const handleModelSelected = useCallback((modelName: string) => {
		setCurrentModelName(modelName);
	}, []);

	const modelSelect = useModelSelect({
		onModelSelected: handleModelSelected,
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
		...chat.messages.map(m => ({ id: m.id, isHeader: false, content: m.content }))
	];

	useEffect(() => {
		const session = sessionService.getCurrent();
		if (session) {
			setCurrentSession(session.id);
			const msgs = memoryService.getPermanentMessages(session.id);
			chat.setMessages(msgs.map(m => ({
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

	const handleEscape = useCallback(() => {
		if (chat.status === 'thinking') {
			chat.stop();
		} else if (chat.status === 'idle') {
			exit();
		}
	}, [chat.status, chat.stop, exit]);

	const handleFileSelect = useCallback(() => {
		fileSelect.open();
	}, [fileSelect]);

	const handleModelSelect = useCallback(() => {
		modelSelect.open();
	}, [modelSelect]);

	return (
		<Box flexDirection="column" width={stdout.columns || 80}>
			<MessageList 
				messages={chat.messages}
				status={chat.status}
				currentModelName={currentModelName}
				historyRemountKey={remountKey}
			/>
			<InputArea 
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
				fileSelectMode={fileSelect.fileSelectMode}
				modelSelectMode={modelSelect.modelSelectMode}
				fileList={fileSelect.fileList}
				selectedIndex={fileSelect.selectedIndex}
				modelList={modelSelect.modelList}
				modelSelectedIndex={modelSelect.modelSelectedIndex}
				currentDir={fileSelect.currentDir}
				onFileSelectConfirm={fileSelect.confirm}
				onFileSelectCancel={fileSelect.cancel}
				onModelSelectConfirm={modelSelect.confirm}
				onModelSelectCancel={modelSelect.cancel}
				onFileSelectUp={fileSelect.moveUp}
				onFileSelectDown={fileSelect.moveDown}
				onModelSelectUp={modelSelect.moveUp}
				onModelSelectDown={modelSelect.moveDown}
				sessionId={currentSession}
				inputRef={inputRef}
			/>
		</Box>
	);
}