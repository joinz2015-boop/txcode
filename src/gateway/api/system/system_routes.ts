import { Router } from 'express';

import * as info_system from './info_system.js';

export function registerRoutes(router: Router) {
  router.get('/system/info_system', info_system.GET);
}
