import { Tool, ToolContext, ToolResult } from '../tool.types.js';
import { playwrightManager } from '../../../services/test/playwrightManager.js';
import { typeText } from '../../../services/test/testBrowserTools.js';

export const testTypeTool: Tool = {
  name: 'test_type',
  description: '在输入框中输入文本。先用 CSS 选择器定位输入框，然后填入指定文本。',
  parameters: {
    type: 'object',
    properties: {
      selector: {
        type: 'string',
        description: 'CSS 选择器，定位输入框',
      },
      text: {
        type: 'string',
        description: '要输入的文本内容',
      },
    },
    required: ['selector', 'text'],
  },
  execute: async (params: { selector: string; text: string }, context: ToolContext): Promise<ToolResult> => {
    const wcId = playwrightManager.getWebContentsIdBySession(context.sessionId);
    if (!wcId) {
      return { success: false, output: '', error: '未注册 webview' };
    }
    const result = await typeText(wcId, params.selector, params.text);
    if (result.success) {
      return { success: true, output: `已在 ${params.selector} 中输入: ${params.text}` };
    }
    return { success: false, output: '', error: result.error };
  },
};
