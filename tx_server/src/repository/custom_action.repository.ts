import { BaseRepository } from './base.repository.js';
import type { CustomActionRow } from '../entity/custom-action.entity.js';

export type { CustomActionRow };

export class CustomActionRepository extends BaseRepository {
  list(): CustomActionRow[] {
    return this.query<CustomActionRow>('SELECT * FROM custom_actions ORDER BY sort_order, created_at');
  }

  listByType(actionType: string): CustomActionRow[] {
    return this.query<CustomActionRow>('SELECT * FROM custom_actions WHERE action_type = ? ORDER BY sort_order', [actionType]);
  }

  getById(id: number): CustomActionRow | undefined {
    return this.queryOne<CustomActionRow>('SELECT * FROM custom_actions WHERE id = ?', [id]) || undefined;
  }

  create(data: { action_type: string; name: string; prompt: string; auto_send?: boolean; sort_order?: number }): number {
    const result = this.execute(
      'INSERT INTO custom_actions (action_type, name, prompt, auto_send, sort_order) VALUES (?, ?, ?, ?, ?)',
      [data.action_type, data.name, data.prompt, data.auto_send ? 1 : 0, data.sort_order || 0]
    );
    return result.lastInsertRowid;
  }

  update(id: number, data: Partial<{ action_type: string; name: string; prompt: string; auto_send: boolean; sort_order: number }>): void {
    const updates: string[] = [];
    const values: unknown[] = [];
    if (data.action_type !== undefined) { updates.push('action_type = ?'); values.push(data.action_type); }
    if (data.name !== undefined) { updates.push('name = ?'); values.push(data.name); }
    if (data.prompt !== undefined) { updates.push('prompt = ?'); values.push(data.prompt); }
    if (data.auto_send !== undefined) { updates.push('auto_send = ?'); values.push(data.auto_send ? 1 : 0); }
    if (data.sort_order !== undefined) { updates.push('sort_order = ?'); values.push(data.sort_order); }
    if (updates.length > 0) {
      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id);
      this.execute(`UPDATE custom_actions SET ${updates.join(', ')} WHERE id = ?`, values);
    }
  }

  delete(id: number): void {
    this.execute('DELETE FROM custom_actions WHERE id = ?', [id]);
  }
}

export const customActionRepository = new CustomActionRepository();
