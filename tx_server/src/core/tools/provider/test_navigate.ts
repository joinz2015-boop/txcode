import { Tool, ToolContext, ToolResult } from '../tool.types.js';
import { playwrightManager } from '../../../services/test/playwrightManager.js';
import { navigate } from '../../../services/test/testBrowserTools.js';

export const testNavigateTool: Tool = {
  name: 'test_navigate',
  description: '导航到指定 URL。用于在测试浏览器中打开或跳转到目标页面。',
  parameters: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: '要导航到的目标 URL',
      },
    },
    required: ['url'],
  },
  execute: async (params: { url: string }, context: ToolContext): Promise<ToolResult> => {
    let wcId: number;
    try {
      await playwrightManager.getOrCreatePage(context.sessionId);
      wcId = playwrightManager.getWebContentsIdBySession(context.sessionId)!;
    } catch (e: any) {
      return { success: false, output: '', error: `无法创建测试页面: ${e.message}` };
    }
    const result = await navigate(wcId, params.url);
    if (result.success) {
      return { success: true, output: `已导航到: ${result.data.url}\n标题: ${result.data.title}` };
    }
    return { success: false, output: '', error: result.error };
  },
};
