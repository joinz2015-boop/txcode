import React from 'react';
import { Box, Text } from 'ink';
import { FileInfo } from './hooks/useFileSelect.js';

interface FileSelectorProps {
	fileList: FileInfo[];
	selectedIndex: number;
	currentDir: string;
}

export function FileSelector({ fileList, selectedIndex, currentDir }: FileSelectorProps) {
	return (
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
	);
}