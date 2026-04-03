import { Router, Request, Response } from 'express';
import { dbService } from '../modules/db/index.js';

export const customActionsRouter = Router();

customActionsRouter.get('/', (req: Request, res: Response) => {
  try {
    const { type } = req.query;
    let sql = 'SELECT * FROM custom_actions';
    const params: (string | number)[] = [];

    if (type) {
      sql += ' WHERE action_type = ?';
      params.push(String(type));
    }

    sql += ' ORDER BY sort_order ASC, created_at DESC';

    const actions = dbService.all(sql, params);
    res.json({ success: true, data: actions });
  } catch (error) {
    console.error('Get custom actions error:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

customActionsRouter.post('/', (req: Request, res: Response) => {
  try {
    const { action_type, name, prompt, auto_send = 0, sort_order = 0 } = req.body;

    if (!action_type || !name || !prompt) {
      return res.status(400).json({ success: false, error: '缺少必填字段' });
    }

    if (!['design', 'code', 'test'].includes(action_type)) {
      return res.status(400).json({ success: false, error: '无效的 action_type' });
    }

    const result = dbService.run(
      'INSERT INTO custom_actions (action_type, name, prompt, auto_send, sort_order) VALUES (?, ?, ?, ?, ?)',
      [action_type, name, prompt, auto_send ? 1 : 0, sort_order]
    );

    const action = dbService.get('SELECT * FROM custom_actions WHERE id = ?', [result.lastInsertRowid]);
    res.json({ success: true, data: action });
  } catch (error) {
    console.error('Create custom action error:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

customActionsRouter.put('/:id', (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { action_type, name, prompt, auto_send, sort_order } = req.body;

    const existing = dbService.get('SELECT * FROM custom_actions WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ success: false, error: '记录不存在' });
    }

    const updateFields: string[] = [];
    const params: (string | number)[] = [];

    if (action_type !== undefined) {
      if (!['design', 'code', 'test'].includes(action_type)) {
        return res.status(400).json({ success: false, error: '无效的 action_type' });
      }
      updateFields.push('action_type = ?');
      params.push(action_type);
    }

    if (name !== undefined) {
      updateFields.push('name = ?');
      params.push(name);
    }

    if (prompt !== undefined) {
      updateFields.push('prompt = ?');
      params.push(prompt);
    }

    if (auto_send !== undefined) {
      updateFields.push('auto_send = ?');
      params.push(auto_send ? 1 : 0);
    }

    if (sort_order !== undefined) {
      updateFields.push('sort_order = ?');
      params.push(sort_order);
    }

    if (updateFields.length === 0) {
      return res.json({ success: true, data: existing });
    }

    params.push(id);
    dbService.run(`UPDATE custom_actions SET ${updateFields.join(', ')} WHERE id = ?`, params);

    const action = dbService.get('SELECT * FROM custom_actions WHERE id = ?', [id]);
    res.json({ success: true, data: action });
  } catch (error) {
    console.error('Update custom action error:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

customActionsRouter.delete('/:id', (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);

    const existing = dbService.get('SELECT * FROM custom_actions WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ success: false, error: '记录不存在' });
    }

    dbService.run('DELETE FROM custom_actions WHERE id = ?', [id]);
    res.json({ success: true, data: existing });
  } catch (error) {
    console.error('Delete custom action error:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});