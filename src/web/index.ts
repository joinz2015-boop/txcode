/**
 * Web 模块
 */

import express, { Request, Response } from 'express';
import path from 'path';
import { WebService } from './web.service.js';

export { WebService } from './web.service.js';

/**
 * 静态文件服务
 */
export function setupStaticFiles(app: express.Application): void {
  const publicDir = path.join(__dirname, 'public');
  app.use(express.static(publicDir));
  
  // SPA fallback
  app.get('*', (req: Request, res: Response) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(publicDir, 'index.html'));
    }
  });
}