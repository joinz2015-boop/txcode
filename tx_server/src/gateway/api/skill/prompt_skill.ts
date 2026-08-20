import { Request, Response } from 'express';
import { buildAvailableSkillsPrompt } from '../../../services/skill/index.js';

export async function GET(_req: Request, res: Response) {
  const prompt = buildAvailableSkillsPrompt();
  res.json({ success: true, data: prompt });
}
