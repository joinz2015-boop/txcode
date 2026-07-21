import { Tool, ToolContext, ToolResult } from '../tool.types.js';
import { playwrightManager } from '../../../services/test/playwrightManager.js';
import { waitFor } from '../../../services/test/testBrowserTools.js';

export const testWaitTool: Tool = {
  name: 'test_wait',
  description: '等待指定时间（毫秒）或等待某个元素出现。传入数字表示等待毫秒数，传入字符串表示等待该 CSS 选择器出现。',
  parameters: {
    type: 'object',
    properties: {
      target: {
        type: 'string',
        description: '等待目标：数字（毫秒）或 CSS 选择器',
      },
    },
    required: ['target'],
  },
  execute: async (params: { target: string }, context: ToolContext): Promise<ToolResult> => {
    const wcId = playwrightManager.getWebContentsIdBySession(context.sessionId);
    if (!wcId) {
      return { success: false, output: '', error: '未注册 webview' };
    }
    const result = await waitFor(wcId, params.target);
    if (result.success) {
      if (result.data.waitedMs) {
        return { success: true, output: `已等待 ${result.data.waitedMs}ms` };
      }
      return { success: true, output: `元素已出现: ${result.data.selector}` };
    }
    return { success: false, output: '', error: result.error };
  },
};
