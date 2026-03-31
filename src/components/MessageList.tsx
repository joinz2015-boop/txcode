import React from 'react';
import { Box, Text, Static } from 'ink';

interface MessageItem {
	id: string;
	content: string;
	role: 'user' | 'assistant' | 'system' | 'tool';
	timestamp: Date;
}

interface Props {
	messages: MessageItem[];
}

export function MessageList({ messages }: Props) {
	return (
		<Box flexDirection="column" flexGrow={1} flexShrink={1}>
			<Static items={messages}>
				{(msg) => (
					<Box key={msg.id} paddingX={1}>
						<Text dimColor>{msg.content}</Text>
					</Box>
				)}
			</Static>
		</Box>
	);
}