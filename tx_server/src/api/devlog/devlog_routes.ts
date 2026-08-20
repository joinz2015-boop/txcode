import { Router } from 'express';

import * as list_devlog from './list_devlog.js';

export function registerRoutes(router: Router) {
  router.get('/devlog/list_devlog', list_devlog.GET);
}
