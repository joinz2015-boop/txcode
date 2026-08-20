import { ToolDefinition } from '../../ai/ai.types.js';
import { getProviderTools } from './index.js';

export async function getOpenAITools(): Promise<ToolDefinition[]> {
  const tools = await getProviderTools();
  
  return tools.map(tool => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));
}

export const openaiTools: ToolDefinition[] = [];
