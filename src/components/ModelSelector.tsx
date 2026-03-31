/**
 * ModelSelector 组件 - 模型选择器 UI
 * 
 * 职责：
 * - 显示模型选择提示
 * - 渲染可选择的模型列表
 * - 高亮当前选中的模型
 * 
 * UI 布局：
 * - 第一行：选择提示 + 操作说明
 * - 后续行：模型列表
 *   - 选中项：绿色粗体 + ▶ 标记
 *   - 未选中项：灰色 + 空格前缀
 * 
 * 使用方式：
 * <ModelSelector 
 *   modelList={[]} 
 *   modelSelectedIndex={0} 
 * />
 */

import React from 'react';
import { Box, Text } from 'ink';
import { ModelInfo } from './hooks/useModelSelect.js';

/**
 * ModelSelector 组件属性
 * @property modelList - 模型列表
 * @property modelSelectedIndex - 当前选中的模型索引
 */
interface ModelSelectorProps {
	/** 模型列表 */
	modelList: ModelInfo[];
	/** 当前选中的模型索引 */
	modelSelectedIndex: number;
}

/**
 * 模型选择器组件
 * 
 * @param props - 组件属性
 * @returns 模型选择器 UI 元素
 */
export function ModelSelector({ modelList, modelSelectedIndex }: ModelSelectorProps) {
	return (
		<Box flexDirection="column" paddingX={1}>
			{/* 标题行：选择提示 + 操作说明 */}
			<Text dimColor>选择模型 (↑↓ 选择, Enter 确认, ESC 取消):</Text>
			
			{/* 模型列表，最多显示 10 个 */}
			{modelList.slice(0, 10).map((model, index) => (
				<Text key={model.id}>
					{/* 选中项：绿色粗体 + ▶ 标记 */}
					{index === modelSelectedIndex ? (
						<Text bold color="green">{`▶ ${model.name}`}</Text>
					) : (
						/* 未选中项：灰色 + 空格前缀 */
						<Text dimColor>{`  ${model.name}`}</Text>
					)}
				</Text>
			))}
		</Box>
	);
}