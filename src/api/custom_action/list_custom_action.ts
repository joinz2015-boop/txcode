import { Request, Response } from "express";
import { dbService } from "../../core/db/index.js";

export async function GET(req: Request, res: Response) {
  try {
    const { type } = req.query;
    let sql = "SELECT * FROM custom_actions";
    const params: (string | number)[] = [];
    if (type) { sql += " WHERE action_type = ?"; params.push(String(type)); }
    sql += " ORDER BY sort_order ASC, created_at DESC";
    res.json({ success: true, data: dbService.all(sql, params) });
  } catch (error) { res.status(500).json({ success: false, error: (error as Error).message }); }
}
