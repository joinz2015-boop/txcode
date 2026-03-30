export interface EmailConfig {
  id?: number
  name: string
  host: string
  port: number
  secure: number
  user: string
  password: string
  from_name?: string
  is_default: number
  created_at?: string
  updated_at?: string
}

export interface SendEmailParams {
  configId?: number
  to: string
  subject: string
  html: string
}
