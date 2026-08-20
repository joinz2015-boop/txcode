import { Request, Response } from 'express';
import { workflowService } from '../../service/workflow/workflow.service.js';

export async function GET(req: Request, res: Response) {
  res.json({ success: true, data: workflowService.getState() });
}
