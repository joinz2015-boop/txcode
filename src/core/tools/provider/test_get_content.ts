import { Tool, ToolContext, ToolResult } from '../tool.types.js';
import { playwrightManager } from '../../../services/test/playwrightManager.js';
import { getContent } from '../../../services/test/testBrowserTools.js';

export const testGetContentTool: Tool = {
  name: 'test_get_content',
  description: '获取当前页面的完整 HTML DOM 结构。用于分析页面元素，帮助 AI 定位选择器。返回内容最多 50000 字符。',
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
    const result = await getContent(wcId);
    if (result.success) {
      return { success: true, output: result.data.content };
    }
    return { success: false, output: '', error: result.error };
  },
};
