import { Tool, ToolContext, ToolResult } from '../tool.types.js'
import { emailService } from '../../email/index.js'

const description = '发送邮件工具。用于向指定邮箱发送邮件，支持 HTML 格式内容。\n\n参数说明：\n- to: 收件人邮箱地址\n- subject: 邮件主题\n- html: 邮件内容（支持 HTML 格式）\n- configId: 邮件配置 ID（可选，默认使用系统默认配置）'

export const emailTool: Tool = {
  name: 'sendEmail',
  description,
  parameters: {
    type: 'object',
    properties: {
      to: {
        type: 'string',
        description: '收件人邮箱地址'
      },
      subject: {
        type: 'string',
        description: '邮件主题'
      },
      html: {
        type: 'string',
        description: '邮件内容（支持 HTML 格式）'
      },
      configId: {
        type: 'number',
        description: '邮件配置 ID（可选，默认使用系统默认配置）'
      }
    },
    required: ['to', 'subject', 'html']
  },
  execute: async (params: { to: string; subject: string; html: string; configId?: number }, _context: ToolContext): Promise<ToolResult> => {
    const result = await emailService.sendEmail({
      configId: params.configId,
      to: params.to,
      subject: params.subject,
      html: params.html,
    })

    if (result.success) {
      return {
        success: true,
        output: `邮件已成功发送至 ${params.to}`
      }
    } else {
      return {
        success: false,
        output: '',
        error: result.error
      }
    }
  }
}
