import { Router } from 'express';

import * as create_custom_action from './create_custom_action.js';
import * as delete_custom_action from './delete_custom_action.js';
import * as list_custom_action from './list_custom_action.js';
import * as update_custom_action from './update_custom_action.js';

export function registerRoutes(router: Router) {
  router.post('/custom_action/create_custom_action', create_custom_action.POST);
  router.post('/custom_action/delete_custom_action', delete_custom_action.POST);
  router.get('/custom_action/list_custom_action', list_custom_action.GET);
  router.post('/custom_action/update_custom_action', update_custom_action.POST);
}
