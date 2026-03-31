/**
 * useFileSelect Hook - 文件选择功能逻辑管理
 * 
 * 职责：
 * - 管理文件选择模式状态 (fileSelectMode)
 * - 管理文件列表和导航状态
 * - 处理目录加载和文件选择逻辑
 * 
 * 功能：
 * - 打开文件选择器时从当前工作目录开始
 * - 支持目录导航（进入/返回）
 * - 文件按目录优先、字母顺序排序
 * - 选择文件后自动转换为相对路径
 * 
 * 使用方式：
 * const fileSelect = useFileSelect({ onFileSelected: (path) => {} });
 * // 使用 fileSelect.open() 打开选择器
 * // 使用 fileSelect.confirm() 确认选择
 * // 使用 fileSelect.moveUp/moveDown 导航
 */

import { useState, useCallback } from 'react';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 文件信息类型定义
 * @property name - 文件/目录名称
 * @property path - 完整路径
 * @property isDirectory - 是否为目录
 */
export interface FileInfo {
	name: string;
	path: string;
	isDirectory?: boolean;
}

/**
 * useFileSelect Hook 配置选项
 * @property onFileSelected - 文件选择完成后的回调，参数为相对路径
 */
interface UseFileSelectOptions {
	onFileSelected?: (relativePath: string) => void;
}

/**
 * 文件选择功能 Hook
 * @param options - 配置选项
 * @returns 文件选择相关的状态和方法
 */
export function useFileSelect(options: UseFileSelectOptions = {}) {
	const { onFileSelected } = options;
	
	/** 是否处于文件选择模式 */
	const [fileSelectMode, setFileSelectMode] = useState(false);
	
	/** 当前浏览的目录路径 */
	const [currentDir, setCurrentDir] = useState('');
	
	/** 基准目录（首次打开时的目录，用于计算相对路径） */
	const [baseDir, setBaseDir] = useState('');
	
	/** 当前目录下的文件和目录列表 */
	const [fileList, setFileList] = useState<FileInfo[]>([]);
	
	/** 当前选中的文件索引 */
	const [selectedIndex, setSelectedIndex] = useState(0);

	/**
	 * 加载指定目录的内容
	 * 
	 * 处理逻辑：
	 * 1. 如果是首次加载（resetBaseDir=true）或没有基准目录，设置基准目录
	 * 2. 添加 ".." 目录项（如果不在根目录）
	 * 3. 读取目录内容并过滤隐藏文件
	 * 4. 排序：目录优先，然后按字母顺序
	 * 5. 限制最多显示 50 个文件
	 * 
	 * @param dir - 要加载的目录路径
	 * @param resetBaseDir - 是否重置基准目录（首次打开时为 true）
	 */
	const loadDirectory = useCallback((dir: string, resetBaseDir: boolean = false) => {
		try {
			// 设置基准目录
			if (!baseDir || resetBaseDir) {
				setBaseDir(dir);
			}
			
			const files: FileInfo[] = [];
			const parentDir = path.dirname(dir);
			
			// 添加上级目录入口（如果不是根目录）
			if (parentDir !== dir) {
				files.push({ name: '..', path: parentDir, isDirectory: true });
			}
			
			// 读取目录内容
			const entries = fs.readdirSync(dir, { withFileTypes: true });
			
			// 遍历目录项，跳过隐藏文件
			for (const entry of entries) {
				if (entry.name === '.' || entry.name === '..') continue;
				const fullPath = path.join(dir, entry.name);
				files.push({
					name: entry.name,
					path: fullPath,
					isDirectory: entry.isDirectory()
				});
			}
			
			// 排序：目录优先，然后按名称字母顺序
			files.sort((a, b) => {
				if (a.name === '..') return -1;
				if (b.name === '..') return 1;
				if (a.isDirectory && !b.isDirectory) return -1;
				if (!a.isDirectory && b.isDirectory) return 1;
				return a.name.localeCompare(b.name);
			});
			
			// 限制显示数量，更新状态
			setFileList(files.slice(0, 50));
			setCurrentDir(dir);
			setSelectedIndex(0);
		} catch (err) {
			// 读取失败时清空列表
			setFileList([]);
		}
	}, [baseDir]);

	/**
	 * 打开文件选择器
	 * - 设置为选择模式
	 * - 从当前工作目录开始加载
	 */
	const open = useCallback(() => {
		setFileSelectMode(true);
		loadDirectory(process.cwd(), true);
	}, [loadDirectory]);

	/**
	 * 确认当前选择
	 * 
	 * 处理逻辑：
	 * 1. 如果选中的是目录或 ".."，进入该目录
	 * 2. 如果选中的是文件，计算相对路径并触发回调
	 * 3. 选择完成后退出选择模式
	 */
	const confirm = useCallback(() => {
		if (fileList[selectedIndex]) {
			const selected = fileList[selectedIndex];
			
			// 选中目录：进入该目录
			if (selected.isDirectory || selected.name === '..') {
				loadDirectory(selected.path);
			} else {
				// 选中文件：计算相对路径
				const fullPath = selected.path;
				const effectiveBaseDir = baseDir || process.cwd();
				let relativePath = path.relative(effectiveBaseDir, fullPath);
				// 统一使用正斜杠
				relativePath = relativePath.split(path.sep).join('/');
				
				// 触发回调
				onFileSelected?.(relativePath);
				
				// 退出选择模式
				setFileSelectMode(false);
				setFileList([]);
				setBaseDir('');
			}
		}
	}, [fileList, selectedIndex, loadDirectory, baseDir, onFileSelected]);

	/**
	 * 取消文件选择
	 * - 退出选择模式
	 * - 清空文件列表和基准目录
	 */
	const cancel = useCallback(() => {
		setFileSelectMode(false);
		setFileList([]);
		setBaseDir('');
	}, []);

	/**
	 * 向上移动选择焦点
	 * - 最小值为 0
	 */
	const moveUp = useCallback(() => {
		setSelectedIndex(prev => Math.max(0, prev - 1));
	}, []);

	/**
	 * 向下移动选择焦点
	 * - 最大值为文件列表长度 - 1
	 */
	const moveDown = useCallback(() => {
		setSelectedIndex(prev => Math.min(fileList.length - 1, prev + 1));
	}, [fileList]);

	/**
	 * 返回 Hook 的结果
	 */
	return {
		fileSelectMode,    // 是否处于选择模式
		currentDir,        // 当前目录
		baseDir,           // 基准目录
		fileList,          // 文件列表
		selectedIndex,     // 当前选中索引
		loadDirectory,     // 加载目录方法
		open,              // 打开选择器
		confirm,           // 确认选择
		cancel,            // 取消选择
		moveUp,            // 上移
		moveDown,          // 下移
	};
}