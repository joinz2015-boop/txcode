import { Router } from 'express';

import * as list_plan_code from './list_plan_code.js';
import * as create_plan_code from './create_plan_code.js';
import * as update_plan_code from './update_plan_code.js';
import * as delete_plan_code from './delete_plan_code.js';
import * as detail_plan_code from './detail_plan_code.js';
import * as save_meta_plan_code from './save_meta_plan_code.js';
import * as save_plan_plan_code from './save_plan_plan_code.js';
import * as read_plan_plan_code from './read_plan_plan_code.js';

export function registerRoutes(router: Router) {
  router.get('/plan-code/list', list_plan_code.GET);
  router.post('/plan-code/create', create_plan_code.POST);
  router.post('/plan-code/update', update_plan_code.POST);
  router.post('/plan-code/delete', delete_plan_code.POST);
  router.get('/plan-code/detail', detail_plan_code.GET);
  router.post('/plan-code/save-meta', save_meta_plan_code.POST);
  router.post('/plan-code/save-plan', save_plan_plan_code.POST);
  router.get('/plan-code/read-plan', read_plan_plan_code.GET);
}
