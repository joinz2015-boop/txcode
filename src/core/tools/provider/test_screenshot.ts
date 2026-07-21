import { Tool, ToolContext, ToolResult } from '../tool.types.js';
import { playwrightManager } from '../../../services/test/playwrightManager.js';
import { screenshot } from '../../../services/test/testBrowserTools.js';

export const testScreenshotTool: Tool = {
  name: 'test_screenshot',
  description: '对当前页面截图，返回 base64 编码的 PNG 图片。用于记录测试过程或分析页面状态。',
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
    const result = await screenshot(wcId);
    if (result.success) {
      return {
        success: true,
        output: '截图成功',
        metadata: { screenshot: result.data.screenshot },
      };
    }
    return { success: false, output: '', error: result.error };
  },
};
