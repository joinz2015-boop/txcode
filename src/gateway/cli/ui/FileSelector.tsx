/**
 * FileSelector 组件 - 文件选择器 UI
 * 
 * 职责：
 * - 显示当前目录路径
 * - 渲染可选择的文件列表
 * - 高亮当前选中的文件
 * 
 * UI 布局：
 * - 第一行：当前目录路径 + 操作提示
 * - 后续行：文件/目录列表
 *   - 选中项：绿色粗体 + ▶ 标记
 *   - 未选中项：灰色 + 空格前缀
 *   - 目录名后添加 / 后缀
 * 
 * 使用方式：
 * <FileSelector 
 *   fileList={[]} 
 *   selectedIndex={0} 
 *   currentDir="/path" 
 * />
 */

import React from 'react';
import { Box, Text } from 'ink';
import { FileInfo } from './hooks/useFileSelect.js';

/**
 * FileSelector 组件属性
 * @property fileList - 文件/目录列表
 * @property selectedIndex - 当前选中的索引
 * @property currentDir - 当前目录路径
 */
interface FileSelectorProps {
	/** 文件/目录列表 */
	fileList: FileInfo[];
	/** 当前选中的索引 */
	selectedIndex: number;
	/** 当前目录路径 */
	currentDir: string;
}

/**
 * 文件选择器组件
 * 
 * @param props - 组件属性
 * @returns 文件选择器 UI 元素
 */
export function FileSelector({ fileList, selectedIndex, currentDir }: FileSelectorProps) {
	return (
		<Box flexDirection="column" paddingX={1}>
			{/* 标题行：显示当前目录和操作提示 */}
			<Text dimColor>{currentDir || '/'} (↑↓ 选择, Enter 确认, ESC 取消)</Text>
			
			{/* 文件列表，最多显示 10 个 */}
			{fileList.slice(0, 10).map((file, index) => (
				<Text key={file.path}>
					{/* 选中项：绿色粗体 + ▶ 标记 */}
					{index === selectedIndex ? (
						<Text bold color="green">{`▶ ${file.name}${file.isDirectory ? '/' : ''}`}</Text>
					) : (
						/* 未选中项：灰色 + 空格前缀 */
						<Text dimColor>{`  ${file.name}${file.isDirectory ? '/' : ''}`}</Text>
					)}
				</Text>
			))}
		</Box>
	);
}