import React from 'react';
import { Box, Text } from 'ink';

interface StatusBarProps {
	status: 'idle' | 'thinking' | 'stopping';
	currentModelName: string;
	tokenStats: {
		promptTokens: number;
		completionTokens: number;
		totalTokens: number;
	};
	sessionId?: string | null;
}

export function StatusBar({ status, currentModelName, tokenStats, sessionId }: StatusBarProps) {
	const sessionText = sessionId ? `${sessionId.slice(0, 8)}` : '无会话';
	
	// 根据状态显示不同的文本和颜色
	const statusText = status === 'thinking' 
		? '思考中... | 按 ESC 停止' 
		: status === 'stopping' 
			? '等待停止...' 
			: '✓ 就绪';
	
	// 思考中状态使用红色，其他状态使用灰色
	const statusColor = status === 'thinking' ? 'red' : undefined;

	return (
		<Box paddingX={2}>
			<Text dimColor>
				<Text color={statusColor}>{statusText}</Text>
				{` | 模型：${currentModelName}`}
				{` | 会话：${sessionText}`}
				{` | token：${tokenStats.totalTokens}`}
				{` | 帮助 /help | 退出 ctrl+c`}
			</Text>
		</Box>
	);
}