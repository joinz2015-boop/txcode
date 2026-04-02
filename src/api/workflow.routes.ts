import { Router, Request, Response } from 'express'
import { workflowService } from '../modules/workflow/workflow.service.js'

export const workflowRouter = Router()

workflowRouter.get('/state', (req: Request, res: Response) => {
  res.json({ success: true, data: workflowService.getState() })
})

workflowRouter.put('/state', (req: Request, res: Response) => {
  const { currentCategory, currentProject, currentStep } = req.body
  if (currentCategory !== undefined) {
    workflowService.setCategory(currentCategory || '')
  }
  if (currentProject !== undefined) {
    workflowService.setProject(currentProject || '')
  }
  if (typeof currentStep === 'number') {
    workflowService.setStep(currentStep)
  }
  res.json({ success: true, data: workflowService.getState() })
})
