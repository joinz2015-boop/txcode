import { Router, Request, Response } from 'express';
import { gatewayService } from '../modules/gateway/index.js';

export const gatewayRouter = Router();

gatewayRouter.get('/dingtalk/config', (req: Request, res: Response) => {
  const config = gatewayService.getConfig();
  res.json({
    success: true,
    data: config,
  });
});

gatewayRouter.put('/dingtalk/config', (req: Request, res: Response) => {
  const { enabled, clientId, clientSecret, botName } = req.body;
  
  gatewayService.updateConfig({
    enabled: Boolean(enabled),
    clientId: clientId || '',
    clientSecret: clientSecret || '',
    botName: botName || '',
  });
  
  res.json({ success: true, message: 'Configuration updated' });
});

gatewayRouter.post('/dingtalk/start', async (req: Request, res: Response) => {
  try {
    await gatewayService.start();
    res.json({ success: true, message: 'Gateway started' });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
});

gatewayRouter.post('/dingtalk/stop', async (req: Request, res: Response) => {
  try {
    await gatewayService.stop();
    res.json({ success: true, message: 'Gateway stopped' });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
});

gatewayRouter.get('/dingtalk/status', (req: Request, res: Response) => {
  const status = gatewayService.getStatus();
  res.json({
    success: true,
    data: {
      running: status.running,
      connectedAt: status.connectedAt,
      enabled: status.config.enabled,
      configured: Boolean(status.config.clientId && status.config.clientSecret),
    },
  });
});

gatewayRouter.get('/queue/status', (req: Request, res: Response) => {
  const queueStatus = gatewayService.getQueueStatus();
  res.json({
    success: true,
    data: queueStatus,
  });
});
