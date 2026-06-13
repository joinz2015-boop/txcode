import nodemailer from 'nodemailer'
import { emailRepository } from '../../repository/email.repository.js'
import { EmailConfig, SendEmailParams } from '../../entity/email.entity.js'

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
      ? emailRepository.findById(configId)
      : emailRepository.findDefault()

    if (!config) {
      return { valid: false, error: '未找到邮件配置' }
    }

    try {
      const transporter = this.getTransporter(config as EmailConfig)
      await transporter.verify()
      return { valid: true }
    } catch (err: any) {
      return { valid: false, error: err.message }
    }
  }

  async sendEmail(params: SendEmailParams): Promise<{ success: boolean; error?: string }> {
    const config = params.configId
      ? emailRepository.findById(params.configId)
      : emailRepository.findDefault()

    if (!config) {
      return { success: false, error: '未找到邮件配置' }
    }

    try {
      const transporter = this.getTransporter(config as EmailConfig)
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
