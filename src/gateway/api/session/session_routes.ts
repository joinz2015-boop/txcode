import { Router } from 'express';

import * as compact_session from './compact_session.js';
import * as create_session from './create_session.js';
import * as delete_session from './delete_session.js';
import * as detail_session from './detail_session.js';
import * as list_session from './list_session.js';
import * as stats_session from './stats_session.js';
import * as status_session from './status_session.js';
import * as switch_session from './switch_session.js';
import * as update_session from './update_session.js';

export function registerRoutes(router: Router) {
  router.post('/session/compact_session', compact_session.POST);
  router.post('/session/create_session', create_session.POST);
  router.post('/session/delete_session', delete_session.POST);
  router.get('/session/detail_session', detail_session.GET);
  router.get('/session/list_session', list_session.GET);
  router.get('/session/stats_session', stats_session.GET);
  router.post('/session/status_session', status_session.POST);
  router.post('/session/switch_session', switch_session.POST);
  router.post('/session/update_session', update_session.POST);
}
