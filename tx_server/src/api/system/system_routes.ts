import { Router } from 'express';

import * as app_info from './app_info.js';
import * as info_system from './info_system.js';
import * as version_check from './version_check.js';

export function registerRoutes(router: Router) {
  router.get('/system/app_info', app_info.GET);
  router.get('/system/info_system', info_system.GET);
  router.get('/system/version_check', version_check.GET);
}
