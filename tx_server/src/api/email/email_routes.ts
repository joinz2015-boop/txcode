import { Router } from 'express';

import * as create_email from './create_email.js';
import * as delete_email from './delete_email.js';
import * as detail_email from './detail_email.js';
import * as list_email from './list_email.js';
import * as set_default_email from './set_default_email.js';
import * as update_email from './update_email.js';
import * as validate_email from './validate_email.js';

export function registerRoutes(router: Router) {
  router.post('/email/create_email', create_email.POST);
  router.post('/email/delete_email', delete_email.POST);
  router.get('/email/detail_email', detail_email.GET);
  router.get('/email/list_email', list_email.GET);
  router.post('/email/set_default_email', set_default_email.POST);
  router.post('/email/update_email', update_email.POST);
  router.post('/email/validate_email', validate_email.POST);
}
