import { Tool, ToolContext, ToolResult } from '../tool.types.js';
import { playwrightManager } from '../../../services/test/playwrightManager.js';
import { getPageUrl } from '../../../services/test/testBrowserTools.js';

export const testGetUrlTool: Tool = {
  name: 'test_get_url',
  description: '获取当前页面的 URL 和标题。',
  parameters: {
    type: 'object',
    properties: {},
    required: [],
  },
  execute: async (_params: {}, context: ToolContext): Promise<ToolResult> => {
    let wcId: number;
    try {
      await playwrightManager.getOrCreatePage(context.sessionId);
      wcId = playwrightManager.getWebContentsIdBySession(context.sessionId)!;
    } catch (e: any) {
      return { success: false, output: '', error: `无法创建测试页面: ${e.message}` };
    }
    const result = await getPageUrl(wcId);
    if (result.success) {
      return { success: true, output: `当前 URL: ${result.data.url}\n标题: ${result.data.title}` };
    }
    return { success: false, output: '', error: result.error };
  },
};
