import { Tool, ToolContext, ToolResult } from '../tool.types.js';
import { playwrightManager } from '../../../services/test/playwrightManager.js';
import { selectOption } from '../../../services/test/testBrowserTools.js';

export const testSelectTool: Tool = {
  name: 'test_select',
  description: '在下拉选择框中选择指定选项。',
  parameters: {
    type: 'object',
    properties: {
      selector: {
        type: 'string',
        description: 'CSS 选择器，定位 select 元素',
      },
      value: {
        type: 'string',
        description: '要选择的选项的值（value 属性）',
      },
    },
    required: ['selector', 'value'],
  },
  execute: async (params: { selector: string; value: string }, context: ToolContext): Promise<ToolResult> => {
    let wcId: number;
    try {
      await playwrightManager.getOrCreatePage(context.sessionId);
      wcId = playwrightManager.getWebContentsIdBySession(context.sessionId)!;
    } catch (e: any) {
      return { success: false, output: '', error: `无法创建测试页面: ${e.message}` };
    }
    const result = await selectOption(wcId, params.selector, params.value);
    if (result.success) {
      return { success: true, output: `已在 ${params.selector} 中选择: ${params.value}` };
    }
    return { success: false, output: '', error: result.error };
  },
};
