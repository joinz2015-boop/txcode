/**
 * 数据库 API 路由模块
 * 
 * 提供数据库表查看的 RESTful API 接口
 * 
 * 路由列表：
 * - GET /api/db/tables          -> 获取所有表列表
 * - GET /api/db/tables/:name    -> 获取表结构信息
 * - GET /api/db/tables/:name/data -> 获取表数据
 */

import { Router, Request, Response } from 'express';
import { dbService } from '../modules/db/index.js';

export const dbRouter = Router();

function logError(msg: string, error: unknown): void {
  console.error(`[db.routes] ${msg}:`, error);
}

interface TableInfo {
  name: string;
  cid: number;
  type: string;
  notnull: number;
  dflt_value: string | null;
  pk: number;
}

/**
 * GET /api/db/tables
 * 获取数据库所有表列表
 */
dbRouter.get('/tables', async (req: Request, res: Response) => {
  try {
    await dbService.refresh();
    const tables = dbService.all<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
    );
    res.json({ tables: tables.map(t => t.name) });
  } catch (error) {
    logError('Failed to get tables:', error);
    res.status(500).json({ success: false, error: 'Failed to get tables' });
  }
});

/**
 * GET /api/db/tables/:name
 * 获取表的结构信息
 */
dbRouter.get('/tables/:name', async (req: Request, res: Response) => {
  const { name } = req.params;
  
  try {
    await dbService.refresh();
    const columns = dbService.all<TableInfo>(`PRAGMA table_info("${name}")`);
    const countResult = dbService.get<{ count: number }>(`SELECT COUNT(*) as count FROM "${name}"`);
    
    res.json({
      name,
      columns: columns.map(col => ({
        cid: col.cid,
        name: col.name,
        type: col.type,
        notnull: col.notnull,
        dflt_value: col.dflt_value,
        pk: col.pk,
      })),
      row_count: countResult?.count || 0,
    });
  } catch (error) {
    logError('Failed to get table info:', error);
    res.status(500).json({ success: false, error: 'Failed to get table info' });
  }
});

/**
 * GET /api/db/tables/:name/data
 * 获取表的数据（分页）
 */
dbRouter.get('/tables/:name/data', async (req: Request, res: Response) => {
  const { name } = req.params;
  const page = Number(req.query.page) || 1;
  const pageSize = Number(req.query.page_size) || 50;
  const offset = (page - 1) * pageSize;
  
  try {
    await dbService.refresh();
    const countResult = dbService.get<{ count: number }>(`SELECT COUNT(*) as count FROM "${name}"`);
    const total = countResult?.count || 0;
    
    const rows = dbService.all<Record<string, unknown>>(
      `SELECT * FROM "${name}" LIMIT ? OFFSET ?`,
      [pageSize, offset]
    );
    
    const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
    
    res.json({
      table_name: name,
      columns,
      rows,
      total,
      page,
      page_size: pageSize,
      total_pages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    logError('Failed to get table data:', error);
    res.status(500).json({ success: false, error: 'Failed to get table data' });
  }
});

/**
 * GET /api/db/tables/:name/data/raw
 * 获取表的数据（简单版本，直接返回所有列）
 */
dbRouter.get('/tables/:name/data/raw', async (req: Request, res: Response) => {
  const { name } = req.params;
  const limit = Number(req.query.limit) || 100;
  
  try {
    await dbService.refresh();
    const rows = dbService.all<Record<string, unknown>>(
      `SELECT * FROM "${name}" LIMIT ?`,
      [limit]
    );
    
    const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
    
    res.json({
      table_name: name,
      columns,
      rows,
    });
  } catch (error) {
    logError('Failed to get table data:', error);
    res.status(500).json({ success: false, error: 'Failed to get table data' });
  }
});
