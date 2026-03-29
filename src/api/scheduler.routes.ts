import { Router, Request, Response } from 'express';
import { schedulerService } from '../modules/scheduler/index.js';
import { taskLogService } from '../modules/scheduler/index.js';

export const schedulerRouter = Router();

schedulerRouter.get('/', (req: Request, res: Response) => {
  const tasks = schedulerService.getAllTasks();
  res.json({
    success: true,
    data: tasks,
  });
});

schedulerRouter.get('/:id', (req: Request, res: Response) => {
  const id = String(req.params.id);
  const task = schedulerService.getTask(id);
  if (!task) {
    return res.status(404).json({ success: false, error: 'Task not found' });
  }
  res.json({ success: true, data: task });
});

schedulerRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { name, scheduleType, model, skills, content, notifyType, enabled } = req.body || {};

    console.log('[Scheduler API] POST /tasks body:', JSON.stringify(req.body));

    if (!name?.trim() || !scheduleType || !model || !content?.trim() || !notifyType) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, scheduleType, model, content, notifyType',
      });
    }

    const id = schedulerService.createTask({
      name: name.trim(),
      scheduleType,
      model,
      skills: skills || [],
      content: content.trim(),
      notifyType,
      enabled: enabled !== false,
    });

    res.json({ success: true, data: { id } });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
});

schedulerRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { name, scheduleType, model, skills, content, notifyType, enabled } = req.body || {};

    const existing = schedulerService.getTask(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    schedulerService.updateTask(id, {
      name: name?.trim(),
      scheduleType,
      model,
      skills,
      content: content?.trim(),
      notifyType,
      enabled,
    });

    res.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
});

schedulerRouter.delete('/:id', (req: Request, res: Response) => {
  const id = String(req.params.id);
  const existing = schedulerService.getTask(id);
  if (!existing) {
    return res.status(404).json({ success: false, error: 'Task not found' });
  }

  schedulerService.deleteTask(id);
  res.json({ success: true });
});

schedulerRouter.post('/:id/start', (req: Request, res: Response) => {
  const id = String(req.params.id);
  const task = schedulerService.getTask(id);
  if (!task) {
    return res.status(404).json({ success: false, error: 'Task not found' });
  }

  schedulerService.startTask(id);
  res.json({ success: true });
});

schedulerRouter.post('/:id/stop', (req: Request, res: Response) => {
  const id = String(req.params.id);
  const task = schedulerService.getTask(id);
  if (!task) {
    return res.status(404).json({ success: false, error: 'Task not found' });
  }

  schedulerService.stopTask(id);
  res.json({ success: true });
});

schedulerRouter.post('/:id/run', async (req: Request, res: Response) => {
  const id = String(req.params.id);
  const task = schedulerService.getTask(id);
  if (!task) {
    return res.status(404).json({ success: false, error: 'Task not found' });
  }

  try {
    const result = await schedulerService.runTaskNow(id);
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
});

schedulerRouter.get('/:id/logs', (req: Request, res: Response) => {
  const id = String(req.params.id);
  const task = schedulerService.getTask(id);
  if (!task) {
    return res.status(404).json({ success: false, error: 'Task not found' });
  }

  const limit = parseInt(req.query.limit as string) || 50;
  const logs = taskLogService.getLogsByTaskId(id, limit);
  res.json({ success: true, data: logs });
});

schedulerRouter.get('/logs/all', (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 100;
  const logs = taskLogService.getAllLogs(limit);
  res.json({ success: true, data: logs });
});
