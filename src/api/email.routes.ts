import { Router, Request, Response } from 'express'
import { emailConfigRepository, emailService } from '../modules/email/index.js'

export const emailRouter = Router()

emailRouter.get('/configs', (req: Request, res: Response) => {
  const configs = emailConfigRepository.findAll()
  res.json({ success: true, data: configs })
})

emailRouter.get('/configs/:id', (req: Request, res: Response) => {
  const config = emailConfigRepository.findById(parseInt(String(req.params.id)))
  if (!config) {
    return res.status(404).json({ success: false, error: '配置不存在' })
  }
  res.json({ success: true, data: config })
})

emailRouter.post('/configs', (req: Request, res: Response) => {
  const { name, host, port, secure, user, password, from_name, is_default } = req.body
  
  if (!name || !host || !user || !password) {
    return res.status(400).json({ success: false, error: '缺少必要参数' })
  }

  const id = emailConfigRepository.create({
    name,
    host,
    port: port || 587,
    secure: secure ? 1 : 0,
    user,
    password,
    from_name,
    is_default: is_default ? 1 : 0,
  }).id

  if (is_default) {
    emailConfigRepository.setDefault(id)
  }

  res.json({ success: true, data: { id } })
})

emailRouter.put('/configs/:id', (req: Request, res: Response) => {
  const id = parseInt(String(req.params.id))
  const { name, host, port, secure, user, password, from_name, is_default } = req.body

  const existing = emailConfigRepository.findById(id)
  if (!existing) {
    return res.status(404).json({ success: false, error: '配置不存在' })
  }

  const updated = emailConfigRepository.update(id, {
    name,
    host,
    port,
    secure: secure !== undefined ? (secure ? 1 : 0) : undefined,
    user,
    password,
    from_name,
    is_default: is_default !== undefined ? (is_default ? 1 : 0) : undefined,
  })

  if (is_default) {
    emailConfigRepository.setDefault(id)
  }

  res.json({ success: true, data: { updated } })
})

emailRouter.delete('/configs/:id', (req: Request, res: Response) => {
  const id = parseInt(String(req.params.id))
  const deleted = emailConfigRepository.delete(id)
  
  if (!deleted) {
    return res.status(404).json({ success: false, error: '配置不存在' })
  }
  
  res.json({ success: true })
})

emailRouter.put('/configs/:id/default', (req: Request, res: Response) => {
  const id = parseInt(String(req.params.id))
  const success = emailConfigRepository.setDefault(id)
  
  if (!success) {
    return res.status(404).json({ success: false, error: '配置不存在' })
  }
  
  res.json({ success: true })
})

emailRouter.post('/validate', async (req: Request, res: Response) => {
  const { configId } = req.body
  const result = await emailService.validateConfig(configId)
  res.json({ success: result.valid, error: result.error })
})
