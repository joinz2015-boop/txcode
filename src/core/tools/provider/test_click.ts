import { Tool, ToolContext, ToolResult } from '../tool.types.js';
import { playwrightManager } from '../../../services/test/playwrightManager.js';
import { click } from '../../../services/test/testBrowserTools.js';

export const testClickTool: Tool = {
  name: 'test_click',
  description: '点击页面元素。使用 CSS 选择器定位并点击目标元素。',
  parameters: {
    type: 'object',
    properties: {
      selector: {
        type: 'string',
        description: 'CSS 选择器，用于定位要点击的元素',
      },
    },
    required: ['selector'],
  },
  execute: async (params: { selector: string }, context: ToolContext): Promise<ToolResult> => {
    let wcId: number;
    try {
      await playwrightManager.getOrCreatePage(context.sessionId);
      wcId = playwrightManager.getWebContentsIdBySession(context.sessionId)!;
    } catch (e: any) {
      return { success: false, output: '', error: `无法创建测试页面: ${e.message}` };
    }
    const result = await click(wcId, params.selector);
    if (result.success) {
      return { success: true, output: `已点击: ${params.selector}` };
    }
    return { success: false, output: '', error: result.error };
  },
};
