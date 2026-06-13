import { Request, Response } from 'express';
import { sessionService } from '../../modules/session/index.js';
import { projectService } from '../../services/project/project.service.js';
import { SessionCreateRequest } from '../api.types.js';

export async function POST(req: Request, res: Response) {
  const { title, projectPath: inputPath } = req.body as SessionCreateRequest;
  const projectPath = inputPath || projectService.getCurrentProjectPath();
  const session = sessionService.create(title, projectPath);
  res.status(201).json({ success: true, data: session });
}
