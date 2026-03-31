import { useInput as useInkInput } from 'ink';
import { useState } from 'react';

interface Message {
	id: string;
	content: string;
	role: 'user' | 'assistant' | 'system' | 'tool';
	timestamp: Date;
}

function getLines(input: string): string[] {
	return input.split('\n');
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

export function useInputHandler(messages: Message[], setMessages: React.Dispatch<React.SetStateAction<Message[]>>, contentHeight: number) {
	const [input, setInput] = useState('');
	const [cursorPosition, setCursorPosition] = useState(0);
	const [scrollTop, setScrollTop] = useState(0);

	const handleSubmit = () => {
		if (!input.trim()) return;
		
		setMessages(prev => [...prev, {
			id: `msg-${Date.now()}`,
			content: input,
			role: 'user',
			timestamp: new Date(),
		}]);
		setInput('');
		setCursorPosition(0);
		setScrollTop(0);
	};

	useInkInput((char, key) => {
		const lineStarts = getLineStartPositions(input);
		const currentLineIndex = lineStarts.findIndex((pos, i) => 
			pos <= cursorPosition && (i === lineStarts.length - 1 || lineStarts[i + 1] > cursorPosition)
		);
		const currentLineStart = lineStarts[currentLineIndex];
		const currentLineLength = currentLineIndex < lineStarts.length - 1 
			? lineStarts[currentLineIndex + 1] - currentLineStart - 1
			: input.length - currentLineStart;
		const positionInLine = cursorPosition - currentLineStart;

		if (key.upArrow) {
			if (currentLineIndex > 0) {
				const prevLineStart = lineStarts[currentLineIndex - 1];
				const prevLineLength = currentLineIndex - 1 < lineStarts.length - 1
					? lineStarts[currentLineIndex] - prevLineStart - 1
					: input.length - prevLineStart;
				const newPos = prevLineStart + Math.min(positionInLine, prevLineLength);
				setCursorPosition(newPos);
			}
		}
		if (key.downArrow) {
			if (currentLineIndex < lineStarts.length - 1) {
				const nextLineStart = lineStarts[currentLineIndex + 1];
				const nextLineLength = currentLineIndex + 1 < lineStarts.length - 1
					? lineStarts[currentLineIndex + 2] - nextLineStart - 1
					: input.length - nextLineStart;
				const newPos = nextLineStart + Math.min(positionInLine, nextLineLength);
				setCursorPosition(newPos);
			}
		}
		if (key.leftArrow) {
			setCursorPosition(prev => Math.max(0, prev - 1));
		}
		if (key.rightArrow) {
			setCursorPosition(prev => Math.min(input.length, prev + 1));
		}
		if (key.return && !key.ctrl) {
			handleSubmit();
		}
		if (key.return && key.ctrl) {
			const newInput = input.slice(0, cursorPosition) + '\n' + input.slice(cursorPosition);
			setInput(newInput);
			setCursorPosition(prev => prev + 1);
		}
		if (key.backspace || key.delete) {
			if (cursorPosition > 0) {
				const newInput = input.slice(0, cursorPosition - 1) + input.slice(cursorPosition);
				setInput(newInput);
				setCursorPosition(prev => prev - 1);
			}
		}
		if (char && !key.ctrl && !key.meta) {
			const newInput = input.slice(0, cursorPosition) + char + input.slice(cursorPosition);
			setInput(newInput);
			setCursorPosition(prev => prev + char.length);
		}
	});

	return { input, cursorPosition, scrollTop, handleSubmit };
}