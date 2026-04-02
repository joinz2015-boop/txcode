/**
 * API 模块入口
 */

import { Router } from 'express';
import { chatRouter } from './chat.routes.js';
import { sessionRouter } from './session.routes.js';
import { configRouter } from './config.routes.js';
import { skillsRouter } from './skills.routes.js';
import { lspRouter } from './lsp.js';
import { projectsRouter } from './projects.routes.js';
import { dbRouter } from './db.routes.js';
import { filesRouter } from './files.routes.js';
import { filesystemRouter } from './filesystem.routes.js';
import { aiLogRouter } from './ai-log.routes.js';
import { gatewayRouter } from './gateway.routes.js';
import { terminalRouter } from './terminal.routes.js';
import { schedulerRouter } from './scheduler.routes.js';
import { emailRouter } from './email.routes.js';
import { workflowRouter } from './workflow.routes.js';
import { gitRouter } from './git.routes.js';

export const apiRouter = Router();

apiRouter.use('/chat', chatRouter);
apiRouter.use('/sessions', sessionRouter);
apiRouter.use('/config', configRouter);
apiRouter.use('/skills', skillsRouter);
apiRouter.use('/lsp', lspRouter);
apiRouter.use('/projects', projectsRouter);
apiRouter.use('/db', dbRouter);
apiRouter.use('/files', filesRouter);
apiRouter.use('/filesystem', filesystemRouter);
apiRouter.use('/ai-logs', aiLogRouter);
apiRouter.use('/gateway', gatewayRouter);
apiRouter.use('/terminal', terminalRouter);
apiRouter.use('/tasks', schedulerRouter);
apiRouter.use('/email', emailRouter);
apiRouter.use('/workflow', workflowRouter);
apiRouter.use('/git', gitRouter);

export type * from './api.types.js';
