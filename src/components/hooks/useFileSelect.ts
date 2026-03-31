import { useState, useCallback } from 'react';
import * as fs from 'fs';
import * as path from 'path';

export interface FileInfo {
	name: string;
	path: string;
	isDirectory?: boolean;
}

interface UseFileSelectOptions {
	onFileSelected?: (relativePath: string) => void;
}

export function useFileSelect(options: UseFileSelectOptions = {}) {
	const { onFileSelected } = options;
	
	const [fileSelectMode, setFileSelectMode] = useState(false);
	const [currentDir, setCurrentDir] = useState('');
	const [baseDir, setBaseDir] = useState('');
	const [fileList, setFileList] = useState<FileInfo[]>([]);
	const [selectedIndex, setSelectedIndex] = useState(0);

	const loadDirectory = useCallback((dir: string, resetBaseDir: boolean = false) => {
		try {
			if (!baseDir || resetBaseDir) {
				setBaseDir(dir);
			}
			
			const files: FileInfo[] = [];
			const parentDir = path.dirname(dir);
			if (parentDir !== dir) {
				files.push({ name: '..', path: parentDir, isDirectory: true });
			}
			
			const entries = fs.readdirSync(dir, { withFileTypes: true });
			
			for (const entry of entries) {
				if (entry.name === '.' || entry.name === '..') continue;
				const fullPath = path.join(dir, entry.name);
				files.push({
					name: entry.name,
					path: fullPath,
					isDirectory: entry.isDirectory()
				});
			}
			
			files.sort((a, b) => {
				if (a.name === '..') return -1;
				if (b.name === '..') return 1;
				if (a.isDirectory && !b.isDirectory) return -1;
				if (!a.isDirectory && b.isDirectory) return 1;
				return a.name.localeCompare(b.name);
			});
			
			setFileList(files.slice(0, 50));
			setCurrentDir(dir);
			setSelectedIndex(0);
		} catch (err) {
			setFileList([]);
		}
	}, [baseDir]);

	const open = useCallback(() => {
		setFileSelectMode(true);
		loadDirectory(process.cwd(), true);
	}, [loadDirectory]);

	const confirm = useCallback(() => {
		if (fileList[selectedIndex]) {
			const selected = fileList[selectedIndex];
			if (selected.isDirectory || selected.name === '..') {
				loadDirectory(selected.path);
			} else {
				const fullPath = selected.path;
				const effectiveBaseDir = baseDir || process.cwd();
				let relativePath = path.relative(effectiveBaseDir, fullPath);
				relativePath = relativePath.split(path.sep).join('/');
				
				onFileSelected?.(relativePath);
				
				setFileSelectMode(false);
				setFileList([]);
				setBaseDir('');
			}
		}
	}, [fileList, selectedIndex, loadDirectory, baseDir, onFileSelected]);

	const cancel = useCallback(() => {
		setFileSelectMode(false);
		setFileList([]);
		setBaseDir('');
	}, []);

	const moveUp = useCallback(() => {
		setSelectedIndex(prev => Math.max(0, prev - 1));
	}, []);

	const moveDown = useCallback(() => {
		setSelectedIndex(prev => Math.min(fileList.length - 1, prev + 1));
	}, [fileList]);

	return {
		fileSelectMode,
		currentDir,
		baseDir,
		fileList,
		selectedIndex,
		loadDirectory,
		open,
		confirm,
		cancel,
		moveUp,
		moveDown,
	};
}