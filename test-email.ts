import { dbService } from './src/modules/db/db.service.js'
import nodemailer from 'nodemailer'

interface EmailConfig {
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

const emailConfigRepository = {
  create(config: Omit<EmailConfig, 'id' | 'created_at' | 'updated_at'>): { id: number } {
    const result = dbService.run(
      `INSERT INTO email_config (name, host, port, secure, user, password, from_name, is_default)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [config.name, config.host, config.port, config.secure, config.user, config.password, config.from_name || null, config.is_default]
    )
    return { id: result.lastInsertRowid }
  },
  findById(id: number): EmailConfig | undefined {
    return dbService.get<EmailConfig>('SELECT * FROM email_config WHERE id = ?', [id])
  },
  findAll(): EmailConfig[] {
    return dbService.all<EmailConfig>('SELECT * FROM email_config ORDER BY created_at DESC')
  },
  findDefault(): EmailConfig | undefined {
    return dbService.get<EmailConfig>('SELECT * FROM email_config WHERE is_default = 1')
  },
}

async function testEmail() {
  await dbService.init()
  console.log('=== 邮件功能测试 ===\n')

  // 1. 检查是否有配置
  const configs = emailConfigRepository.findAll()
  console.log('1. 查询所有邮件配置:', configs)

  // 2. 如果没有配置，创建测试配置
  let configId: number | undefined
  if (configs.length === 0) {
    console.log('\n2. 未找到配置，创建测试配置...')
    const newId = emailConfigRepository.create({
      name: '测试配置',
      host: 'smtp.example.com',
      port: 587,
      secure: 0,
      user: 'test@example.com',
      password: 'your-password',
      from_name: '测试发件人',
      is_default: 1,
    })
    console.log('创建的配置ID:', newId)
    configId = newId.id
  } else {
    configId = configs[0].id
    console.log('\n2. 使用现有配置 ID:', configId)
  }

  // 3. 获取配置并测试连接
  const config = emailConfigRepository.findById(configId!)
  if (config) {
    console.log('\n3. 测试配置连接...')
    console.log('配置详情:', { ...config, password: '***' })
    
    try {
      const transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure === 1,
        auth: {
          user: config.user,
          pass: config.password,
        },
      })
      await transporter.verify()
      console.log('✓ 配置验证成功!')
    } catch (err: any) {
      console.log('✗ 配置验证失败:', err.message)
    }
  }

  console.log('\n=== 测试完成 ===')
  console.log('\n提示: 请通过 Web 界面配置真实的 SMTP 服务器信息进行测试。')
  console.log('Web 界面地址: http://localhost:3000/gateway/email-config')
}

testEmail().catch(console.error)
