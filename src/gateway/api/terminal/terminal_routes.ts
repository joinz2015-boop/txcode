import { Router } from 'express';

import * as create_terminal from './create_terminal.js';
import * as delete_terminal from './delete_terminal.js';
import * as detail_terminal from './detail_terminal.js';
import * as list_terminal from './list_terminal.js';
import * as status_terminal from './status_terminal.js';

export function registerRoutes(router: Router) {
  router.post('/terminal/create_terminal', create_terminal.POST);
  router.post('/terminal/delete_terminal', delete_terminal.POST);
  router.get('/terminal/detail_terminal', detail_terminal.GET);
  router.get('/terminal/list_terminal', list_terminal.GET);
  router.get('/terminal/status_terminal', status_terminal.GET);
}
