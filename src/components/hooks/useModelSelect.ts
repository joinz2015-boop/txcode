import { useState, useCallback } from 'react';
import { configService } from '../../modules/config/index.js';

export interface ModelInfo {
	id: string;
	name: string;
}

interface UseModelSelectOptions {
	onModelSelected?: (modelName: string) => void;
}

export function useModelSelect(options: UseModelSelectOptions = {}) {
	const { onModelSelected } = options;
	
	const [modelSelectMode, setModelSelectMode] = useState(false);
	const [modelList, setModelList] = useState<ModelInfo[]>([]);
	const [modelSelectedIndex, setModelSelectedIndex] = useState(0);

	const loadModels = useCallback(async () => {
		try {
			const providers = configService.getProviders();
			const models: ModelInfo[] = [];
			
			for (const provider of providers) {
				const providerModels = configService.getModels(provider.id);
				for (const m of providerModels) {
					models.push({ id: m.id, name: m.name });
				}
			}
			
			if (models.length === 0) {
				models.push({ id: 'deepseek-chat', name: 'deepseek-chat' });
			}
			
			setModelList(models);
			setModelSelectedIndex(0);
		} catch (err) {
			setModelList([]);
		}
	}, []);

	const open = useCallback(() => {
		setModelSelectMode(true);
		loadModels();
	}, [loadModels]);

	const confirm = useCallback(() => {
		if (modelList[modelSelectedIndex]) {
			const modelName = modelList[modelSelectedIndex].name;
			configService.set('defaultModel', modelName);
			onModelSelected?.(modelName);
		}
		setModelSelectMode(false);
		setModelList([]);
	}, [modelList, modelSelectedIndex, onModelSelected]);

	const cancel = useCallback(() => {
		setModelSelectMode(false);
		setModelList([]);
	}, []);

	const moveUp = useCallback(() => {
		setModelSelectedIndex(prev => Math.max(0, prev - 1));
	}, []);

	const moveDown = useCallback(() => {
		setModelSelectedIndex(prev => Math.min(modelList.length - 1, prev + 1));
	}, [modelList]);

	return {
		modelSelectMode,
		modelList,
		modelSelectedIndex,
		loadModels,
		open,
		confirm,
		cancel,
		moveUp,
		moveDown,
	};
}