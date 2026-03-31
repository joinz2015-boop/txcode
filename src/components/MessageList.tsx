import React, { useMemo } from 'react';
import { Box, Text, Static } from 'ink';
import type { MessageItem } from '../cli/cli.types.js';
import { Header } from './Header.js';

const HEADER_KEY = 'header-static-key';

interface Props {
	messages: MessageItem[];
	status?: 'idle' | 'thinking' | 'stopping';
	currentModelName?: string;
	historyRemountKey?: number;
}

export function MessageList({ messages, status, currentModelName, historyRemountKey }: Props) {
	const visibleMessages = useMemo(() => {
		const maxVisible = 200;
		if (messages.length > maxVisible) {
			return messages.slice(-maxVisible);
		}
		return messages;
	}, [messages]);

	const key = historyRemountKey ?? 0;

	const items: Array<{ id: string; isHeader: boolean; msg?: MessageItem }> = [
		{ id: HEADER_KEY, isHeader: true },
		...visibleMessages.map(m => ({ id: m.id, isHeader: false, msg: m }))
	];

	return (
		<Box flexDirection="column" flexGrow={1} flexShrink={1}>
			<Static key={key} items={items as any}>
				{(item: { id: string; isHeader: boolean; msg?: MessageItem }) => (
					<Box key={item.id}>
						{item.isHeader ? <Header /> : <MessageItemView key={item.id} msg={item.msg!} />}
					</Box>
				)}
			</Static>
		</Box>
	);
}

function MessageItemView({ msg }: { msg: MessageItem }) {
	const isToolCall = (content: string) => {
		return content.startsWith('🔧') || content.startsWith('✓') || content.startsWith('* ');
	};

	const isThought = (content: string) => {
		return content.startsWith('💭') || content.startsWith('~ ');
	};

	const formatToolCall = (content: string) => {
		if (content.startsWith('🔧 ')) {
			return content.replace('🔧 ', '* ').replace(' ✓', '').replace(' ❌', '');
		}
		return content;
	};

	const formatThought = (content: string) => {
		if (content.startsWith('💭 ')) {
			return content.replace('💭 ', '~ ');
		}
		return content;
	};

	if (msg.role === 'user') {
		return (
			<Box 
				backgroundColor="#121212"
				paddingX={2}
				paddingY={1}
				borderLeft="2"
				borderColor="#27272a"
				marginBottom={1}
			>
				<Text bold color="#f4f4f5"># {msg.content}</Text>
			</Box>
		);
	}

	if (msg.role === 'assistant') {
		let thought = '';
		let toolCalls: any[] = [];
		let success = true;
		
		try {
			const parsed = JSON.parse(msg.content);
			if (parsed.type === 'assistant_with_tools') {
				thought = parsed.thought || '';
				toolCalls = parsed.toolCalls || [];
				success = parsed.success !== false;
			} else {
				thought = msg.content;
			}
		} catch {
			thought = msg.content;
		}
		
		const actionNames: Record<string, string> = {
			'read': '读取文件',
			'read_file': '读取文件',
			'edit_file': '编辑文件',
			'write_file': '写入文件',
			'bash': '执行命令',
			'execute_bash': '执行命令',
			'find_files': '搜索文件',
			'grep': '搜索内容',
			'glob': '文件匹配',
		};
		
		return (
			<Box marginBottom={1} flexDirection="column">
				{thought && (
					<Box paddingLeft={2}>
						<Text bold color="cyan">~ {thought.slice(0, 150)}{thought.length > 150 ? '...' : ''}</Text>
					</Box>
				)}
				{toolCalls.map((tc: any, idx: number) => {
					const name = tc.function?.name || 'unknown';
					const actionName = actionNames[name] || name;
					return (
						<Box key={idx} paddingLeft={2}>
							<Text dimColor>* {actionName} {success ? '✓' : '✗'}</Text>
						</Box>
					);
				})}
				{!thought && toolCalls.length === 0 && (
					<Box paddingLeft={2}>
						<Text color="#d4d4d8">{msg.content}</Text>
					</Box>
				)}
			</Box>
		);
	}

	const isThoughtMsg = msg.role === 'system' && isThought(msg.content);
	const isTool = msg.role === 'system' && isToolCall(msg.content);
	const isError = msg.role === 'system' && msg.content.startsWith('错误:');
	
	if (isThoughtMsg) {
		return (
			<Box marginBottom={1} paddingLeft={2}>
				<Text bold color="cyan">{formatThought(msg.content)}</Text>
			</Box>
		);
	}
	
	if (isTool) {
		return (
			<Box marginBottom={1} paddingLeft={2}>
				<Text dimColor>{formatToolCall(msg.content)}</Text>
			</Box>
		);
	}
	
	if (isError) {
		return (
			<Box marginBottom={1} paddingLeft={2}>
				<Text color="red">{msg.content}</Text>
			</Box>
		);
	}
	
	if (msg.role === 'system') {
		return (
			<Box marginBottom={1} paddingLeft={2}>
				<Text dimColor>{msg.content}</Text>
			</Box>
		);
	}
	
	return null;
}