import { Tool, ToolContext, ToolResult } from '../tool.types.js';
import { playwrightManager } from '../../../services/test/playwrightManager.js';
import { assertElement } from '../../../services/test/testBrowserTools.js';

export const testAssertElementTool: Tool = {
  name: 'test_assert_element',
  description: '断言页面上存在指定 CSS 选择器的元素。用于验证测试结果。',
  parameters: {
    type: 'object',
    properties: {
      selector: {
        type: 'string',
        description: 'CSS 选择器，要验证存在的元素',
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
    const result = await assertElement(wcId, params.selector);
    if (result.success) {
      return { success: true, output: `断言通过: 元素 ${params.selector} 存在 (${result.data.count} 个)` };
    }
    return { success: false, output: '', error: result.error };
  },
};
