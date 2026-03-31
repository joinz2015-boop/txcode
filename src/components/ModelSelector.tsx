import React from 'react';
import { Box, Text } from 'ink';
import { ModelInfo } from './hooks/useModelSelect.js';

interface ModelSelectorProps {
	modelList: ModelInfo[];
	modelSelectedIndex: number;
}

export function ModelSelector({ modelList, modelSelectedIndex }: ModelSelectorProps) {
	return (
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
	);
}