import React from 'react';
import { Box, Text } from 'ink';
import { useInputHandler } from './useInputHandler.js';

interface InputAreaProps {
	messages: any[];
	setMessages: React.Dispatch<React.SetStateAction<any[]>>;
	contentHeight: number;
	status: 'idle' | 'thinking' | 'stopping';
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

export function InputArea({ messages, setMessages, contentHeight, status }: InputAreaProps) {
	const { input, cursorPosition } = useInputHandler(messages, setMessages, contentHeight);

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
			<Box paddingX={2}>
				<Text dimColor>
					{status === 'thinking' ? '思考中... | 按 ESC 停止' : '就绪 | Enter 发送 | Ctrl+Enter 换行 | ctrl+c 退出'}
				</Text>
			</Box>
		</Box>
	);
}