import { Request, Response } from 'express';
import { workflowService } from '../../../services/workflow/workflow.service.js';

export async function POST(req: Request, res: Response) {
  const { currentCategory, currentProject, currentStep } = req.body;
  if (currentCategory !== undefined) workflowService.setCategory(currentCategory || '');
  if (currentProject !== undefined) workflowService.setProject(currentProject || '');
  if (typeof currentStep === 'number') workflowService.setStep(currentStep);
  res.json({ success: true, data: workflowService.getState() });
}
