import { Router } from 'express';

import * as state_workflow from './state_workflow.js';
import * as update_workflow from './update_workflow.js';

export function registerRoutes(router: Router) {
  router.get('/workflow/state_workflow', state_workflow.GET);
  router.post('/workflow/update_workflow', update_workflow.POST);
}
