import { Router } from 'express';

import * as create_scheduler from './create_scheduler.js';
import * as delete_scheduler from './delete_scheduler.js';
import * as list_scheduler from './list_scheduler.js';
import * as logs_scheduler from './logs_scheduler.js';
import * as run_scheduler from './run_scheduler.js';
import * as start_scheduler from './start_scheduler.js';
import * as stop_scheduler from './stop_scheduler.js';
import * as update_scheduler from './update_scheduler.js';

export function registerRoutes(router: Router) {
  router.post('/scheduler/create_scheduler', create_scheduler.POST);
  router.post('/scheduler/delete_scheduler', delete_scheduler.POST);
  router.get('/scheduler/list_scheduler', list_scheduler.GET);
  router.get('/scheduler/logs_scheduler', logs_scheduler.GET);
  router.post('/scheduler/run_scheduler', run_scheduler.POST);
  router.post('/scheduler/start_scheduler', start_scheduler.POST);
  router.post('/scheduler/stop_scheduler', stop_scheduler.POST);
  router.post('/scheduler/update_scheduler', update_scheduler.POST);
}
