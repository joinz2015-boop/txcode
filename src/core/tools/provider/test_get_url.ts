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
    const wcId = playwrightManager.getWebContentsIdBySession(context.sessionId);
    if (!wcId) {
      return { success: false, output: '', error: '未注册 webview' };
    }
    const result = await getPageUrl(wcId);
    if (result.success) {
      return { success: true, output: `当前 URL: ${result.data.url}\n标题: ${result.data.title}` };
    }
    return { success: false, output: '', error: result.error };
  },
};
