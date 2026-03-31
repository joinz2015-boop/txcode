import React from 'react';
import { Box, Text } from 'ink';
import { useInputHandler } from './useInputHandler.js';
import { StatusBar } from './StatusBar.js';

interface InputAreaProps {
	messages: any[];
	setMessages: React.Dispatch<React.SetStateAction<any[]>>;
	contentHeight: number;
	status: 'idle' | 'thinking' | 'stopping';
	currentModelName: string;
	tokenStats: {
		promptTokens: number;
		completionTokens: number;
		totalTokens: number;
	};
	onSubmit: (input: string) => void;
	onEscape: () => void;
	onFileSelect: () => void;
	onModelSelect: () => void;
	fileSelectMode: boolean;
	modelSelectMode: boolean;
	fileList: { name: string; path: string; isDirectory?: boolean }[];
	selectedIndex: number;
	modelList: { id: string; name: string }[];
	modelSelectedIndex: number;
	currentDir: string;
	onFileSelectConfirm: () => void;
	onFileSelectCancel: () => void;
	onModelSelectConfirm: () => void;
	onModelSelectCancel: () => void;
	onFileSelectUp: () => void;
	onFileSelectDown: () => void;
	onModelSelectUp: () => void;
	onModelSelectDown: () => void;
	sessionId?: string | null;
	onFileSelected?: (filePath: string) => void;
	inputRef?: React.MutableRefObject<{ input: string; cursorPosition: number; setInput: (v: string) => void; setCursorPosition: (v: number) => void }>;
}

function getLineStartPositions(input: string): number[] {
	const positions = [0];
	for (let i = 0; i < input.length; i++) {
		if (input[i] === '\n') {
			positions.push(i + 1);
		}
	}
	return positions;
}

export function InputArea(props: InputAreaProps) {
	const { 
		messages, setMessages, contentHeight, status, currentModelName, tokenStats,
		onSubmit, onEscape, onFileSelect, onModelSelect,
		fileSelectMode, modelSelectMode, fileList, selectedIndex,
		modelList, modelSelectedIndex, currentDir,
		onFileSelectConfirm, onFileSelectCancel, onModelSelectConfirm, onModelSelectCancel,
		onFileSelectUp, onFileSelectDown, onModelSelectUp, onModelSelectDown,
		sessionId, onFileSelected, inputRef
	} = props;

	const { input, cursorPosition, setInput: setInputValue, setCursorPosition: setCursorPos } = useInputHandler(
		messages, setMessages, contentHeight, 
		{
			onSubmit, onEscape, onFileSelect, onModelSelect,
			fileSelectMode, modelSelectMode,
			onFileSelectConfirm, onFileSelectCancel, onModelSelectConfirm, onModelSelectCancel,
			onFileSelectUp, onFileSelectDown, onModelSelectUp, onModelSelectDown,
			onFileSelected
		}
	);

	React.useEffect(() => {
		if (inputRef?.current) {
			inputRef.current.input = input;
			inputRef.current.cursorPosition = cursorPosition;
			inputRef.current.setInput = setInputValue;
			inputRef.current.setCursorPosition = setCursorPos;
		}
	}, [input, cursorPosition, setInputValue, setCursorPos, inputRef]);

	const lines = input.split('\n');
	const lineStarts = getLineStartPositions(input);
	const currentLineIndex = lineStarts.findIndex((pos, i) => 
		pos <= cursorPosition && (i === lineStarts.length - 1 || lineStarts[i + 1] > cursorPosition)
	);
	const positionInLine = cursorPosition - lineStarts[currentLineIndex];

	return (
		<Box flexDirection="column" flexShrink={0} flexGrow={0}>
			<Box borderStyle="single" borderColor="gray" paddingX={1} flexDirection="column">
				{lines.map((line, lineIdx) => (
					<Box key={lineIdx}>
						<Text dimColor>{'> '}</Text>
						{lineIdx === currentLineIndex ? (
							<>
								<Text>{line.slice(0, positionInLine)}</Text>
								<Text color="cyan">▋</Text>
								<Text>{line.slice(positionInLine)}</Text>
							</>
						) : (
							<Text>{line}</Text>
						)}
					</Box>
				))}
			</Box>

			{fileSelectMode && (
				<Box flexDirection="column" paddingX={1}>
					<Text dimColor>{currentDir || '/'} (↑↓ 选择, Enter 确认, ESC 取消)</Text>
					{fileList.slice(0, 10).map((file, index) => (
						<Text key={file.path}>
							{index === selectedIndex ? (
								<Text bold color="green">{`▶ ${file.name}${file.isDirectory ? '/' : ''}`}</Text>
							) : (
								<Text dimColor>{`  ${file.name}${file.isDirectory ? '/' : ''}`}</Text>
							)}
						</Text>
					))}
				</Box>
			)}

			{modelSelectMode && (
				<Box flexDirection="column" paddingX={1}>
					<Text dimColor>选择模型 (↑↓ 选择, Enter 确认, ESC 取消):</Text>
					{modelList.slice(0, 10).map((model, index) => (
						<Text key={model.id}>
							{index === modelSelectedIndex ? (
								<Text bold color="green">{`▶ ${model.name}`}</Text>
							) : (
								<Text dimColor>{`  ${model.name}`}</Text>
							)}
						</Text>
					))}
				</Box>
			)}

			<StatusBar status={status} currentModelName={currentModelName} tokenStats={tokenStats} sessionId={sessionId} />
		</Box>
	);
}