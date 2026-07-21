import { Tool, ToolContext, ToolResult } from '../tool.types.js';
import { playwrightManager } from '../../../services/test/playwrightManager.js';
import { assertText } from '../../../services/test/testBrowserTools.js';

export const testAssertTextTool: Tool = {
  name: 'test_assert_text',
  description: '断言页面上存在指定文本。用于验证测试结果。',
  parameters: {
    type: 'object',
    properties: {
      text: {
        type: 'string',
        description: '要验证存在的文本',
      },
    },
    required: ['text'],
  },
  execute: async (params: { text: string }, context: ToolContext): Promise<ToolResult> => {
    const wcId = playwrightManager.getWebContentsIdBySession(context.sessionId);
    if (!wcId) {
      return { success: false, output: '', error: '未注册 webview' };
    }
    const result = await assertText(wcId, params.text);
    if (result.success) {
      return { success: true, output: `断言通过: 页面包含文本 "${params.text}"` };
    }
    return { success: false, output: '', error: result.error };
  },
};
