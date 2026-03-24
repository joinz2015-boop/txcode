/**
 * API 模块入口
 */

import { Router } from 'express';
import { chatRouter } from './chat.routes.js';
import { sessionRouter } from './session.routes.js';
import { configRouter } from './config.routes.js';
import { skillsRouter } from './skills.routes.js';
import { lspRouter } from './lsp.js';

export const apiRouter = Router();

apiRouter.use('/chat', chatRouter);
apiRouter.use('/sessions', sessionRouter);
apiRouter.use('/config', configRouter);
apiRouter.use('/skills', skillsRouter);
apiRouter.use('/lsp', lspRouter);

export * from './api.types.js';