/**
 * useModelSelect Hook - 模型选择功能逻辑管理
 * 
 * 职责：
 * - 管理模型选择模式状态 (modelSelectMode)
 * - 管理模型列表和选中状态
 * - 从配置服务加载可用模型
 * - 处理模型选择确认逻辑
 * 
 * 功能：
 * - 从配置服务获取所有可用的 AI 模型
 * - 支持多个 provider 的模型
 * - 选择模型后自动保存为默认模型
 * 
 * 使用方式：
 * const modelSelect = useModelSelect({ onModelSelected: (name) => {} });
 * // 使用 modelSelect.open() 打开选择器
 * // 使用 modelSelect.confirm() 确认选择
 * // 使用 modelSelect.moveUp/moveDown 导航
 */

import { useState, useCallback } from 'react';
import { configService } from '../../modules/config/index.js';

/**
 * 模型信息类型定义
 * @property id - 模型唯一标识
 * @property name - 模型显示名称
 */
export interface ModelInfo {
	id: string;
	name: string;
}

/**
 * useModelSelect Hook 配置选项
 * @property onModelSelected - 模型选择完成后的回调，参数为模型名称
 */
interface UseModelSelectOptions {
	onModelSelected?: (modelName: string) => void;
}

/**
 * 模型选择功能 Hook
 * @param options - 配置选项
 * @returns 模型选择相关的状态和方法
 */
export function useModelSelect(options: UseModelSelectOptions = {}) {
	const { onModelSelected } = options;
	
	/** 是否处于模型选择模式 */
	const [modelSelectMode, setModelSelectMode] = useState(false);
	
	/** 可用模型列表 */
	const [modelList, setModelList] = useState<ModelInfo[]>([]);
	
	/** 当前选中的模型索引 */
	const [modelSelectedIndex, setModelSelectedIndex] = useState(0);

	/**
	 * 加载可用的模型列表
	 * 
	 * 处理逻辑：
	 * 1. 从配置服务获取所有 provider
	 * 2. 遍历每个 provider 获取其模型列表
	 * 3. 如果没有可用模型，添加默认的 deepseek-chat
	 * 
	 * @returns Promise - 加载完成
	 */
	const loadModels = useCallback(async () => {
		try {
			// 获取所有 provider
			const providers = configService.getProviders();
			const models: ModelInfo[] = [];
			
			// 遍历每个 provider 获取模型
			for (const provider of providers) {
				const providerModels = configService.getModels(provider.id);
				for (const m of providerModels) {
					models.push({ id: m.id, name: m.name });
				}
			}
			
			// 如果没有可用模型，使用默认值
			if (models.length === 0) {
				models.push({ id: 'deepseek-chat', name: 'deepseek-chat' });
			}
			
			setModelList(models);
			setModelSelectedIndex(0);
		} catch (err) {
			setModelList([]);
		}
	}, []);

	/**
	 * 打开模型选择器
	 * - 设置为选择模式
	 * - 加载可用模型列表
	 */
	const open = useCallback(() => {
		setModelSelectMode(true);
		loadModels();
	}, [loadModels]);

	/**
	 * 确认当前选择的模型
	 * 
	 * 处理逻辑：
	 * 1. 获取选中的模型名称
	 * 2. 通过 configService 保存为默认模型
	 * 3. 触发 onModelSelected 回调
	 * 4. 退出选择模式并清空列表
	 */
	const confirm = useCallback(() => {
		if (modelList[modelSelectedIndex]) {
			const modelName = modelList[modelSelectedIndex].name;
			// 保存为默认模型
			configService.set('defaultModel', modelName);
			// 触发回调
			onModelSelected?.(modelName);
		}
		// 退出选择模式
		setModelSelectMode(false);
		setModelList([]);
	}, [modelList, modelSelectedIndex, onModelSelected]);

	/**
	 * 取消模型选择
	 * - 退出选择模式
	 * - 清空模型列表
	 */
	const cancel = useCallback(() => {
		setModelSelectMode(false);
		setModelList([]);
	}, []);

	/**
	 * 向上移动选择焦点
	 * - 最小值为 0
	 */
	const moveUp = useCallback(() => {
		setModelSelectedIndex(prev => Math.max(0, prev - 1));
	}, []);

	/**
	 * 向下移动选择焦点
	 * - 最大值为模型列表长度 - 1
	 */
	const moveDown = useCallback(() => {
		setModelSelectedIndex(prev => Math.min(modelList.length - 1, prev + 1));
	}, [modelList]);

	/**
	 * 返回 Hook 的结果
	 */
	return {
		modelSelectMode,    // 是否处于选择模式
		modelList,          // 模型列表
		modelSelectedIndex, // 当前选中索引
		loadModels,         // 加载模型方法
		open,               // 打开选择器
		confirm,            // 确认选择
		cancel,             // 取消选择
		moveUp,             // 上移
		moveDown,           // 下移
	};
}