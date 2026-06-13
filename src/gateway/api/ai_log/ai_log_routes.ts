import { Router } from 'express';

import * as list_ai_log from './list_ai_log.js';

export function registerRoutes(router: Router) {
  router.get('/ai_log/list_ai_log', list_ai_log.GET);
}
