import { Request, Response } from "express";
import { customActionRepository } from "../../../repository/custom_action.repository.js";

export async function GET(req: Request, res: Response) {
  try {
    const { type } = req.query;
    const data = type
      ? customActionRepository.listByType(String(type))
      : customActionRepository.list();
    res.json({ success: true, data });
  } catch (error) { res.status(500).json({ success: false, error: (error as Error).message }); }
}
