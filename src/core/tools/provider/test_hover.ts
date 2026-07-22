import { Tool, ToolContext, ToolResult } from '../tool.types.js';
import { playwrightManager } from '../../../services/test/playwrightManager.js';
import { hover } from '../../../services/test/testBrowserTools.js';

export const testHoverTool: Tool = {
  name: 'test_hover',
  description: '将鼠标悬停在指定元素上，用于触发悬停效果（如下拉菜单、提示框等）。',
  parameters: {
    type: 'object',
    properties: {
      selector: {
        type: 'string',
        description: 'CSS 选择器，定位要悬停的元素',
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
    const result = await hover(wcId, params.selector);
    if (result.success) {
      return { success: true, output: `已悬停在: ${params.selector}` };
    }
    return { success: false, output: '', error: result.error };
  },
};
