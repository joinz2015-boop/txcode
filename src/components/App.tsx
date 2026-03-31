import React, { useState, useEffect } from 'react';
import { Box, Text, useStdout, Static } from 'ink';
import { Header } from './Header.js';
import { InputArea } from './InputArea.js';

interface Message {
	id: string;
	content: string;
	role: 'user' | 'assistant' | 'system' | 'tool';
	timestamp: Date;
}

const HEADER_KEY = 'header-static-key';

export function App() {
	const { stdout } = useStdout();
	const [messages, setMessages] = useState<Message[]>([]);
	const [remountKey, setRemountKey] = useState(0);

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

	return (
		<Box flexDirection="column" width={stdout.columns || 80}>
			<Static key={`all-${remountKey}`} items={items as any}>
				{(item) => (
					<Box key={item.id}>
						{item.isHeader ? <Header /> : (
							<Box paddingX={1}>
								<Text dimColor>{item.content}</Text>
							</Box>
						)}
					</Box>
				)}
			</Static>
			<InputArea 
				key={`input-${messages.length}`}
				messages={messages}
				setMessages={setMessages}
				contentHeight={contentHeight}
				status="idle" 
			/>
		</Box>
	);
}