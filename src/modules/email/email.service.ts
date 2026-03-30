import nodemailer from 'nodemailer'
import { emailConfigRepository } from './email.config.repository.js'
import { EmailConfig, SendEmailParams } from './email.types.js'

export class EmailService {
  private getTransporter(config: EmailConfig) {
    return nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure === 1,
      auth: {
        user: config.user,
        pass: config.password,
      },
    })
  }

  async validateConfig(configId?: number): Promise<{ valid: boolean; error?: string }> {
    const config = configId
      ? emailConfigRepository.findById(configId)
      : emailConfigRepository.findDefault()

    if (!config) {
      return { valid: false, error: '未找到邮件配置' }
    }

    try {
      const transporter = this.getTransporter(config)
      await transporter.verify()
      return { valid: true }
    } catch (err: any) {
      return { valid: false, error: err.message }
    }
  }

  async sendEmail(params: SendEmailParams): Promise<{ success: boolean; error?: string }> {
    const config = params.configId
      ? emailConfigRepository.findById(params.configId)
      : emailConfigRepository.findDefault()

    if (!config) {
      return { success: false, error: '未找到邮件配置' }
    }

    try {
      const transporter = this.getTransporter(config)
      await transporter.sendMail({
        from: config.from_name ? `"${config.from_name}" <${config.user}>` : config.user,
        to: params.to,
        subject: params.subject,
        html: params.html,
      })
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }
}

export const emailService = new EmailService()
