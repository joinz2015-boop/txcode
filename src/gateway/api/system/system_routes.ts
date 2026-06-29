import { Router } from 'express';

import * as info_system from './info_system.js';
import * as version_check from './version_check.js';

export function registerRoutes(router: Router) {
  router.get('/system/info_system', info_system.GET);
  router.get('/system/version_check', version_check.GET);
}
