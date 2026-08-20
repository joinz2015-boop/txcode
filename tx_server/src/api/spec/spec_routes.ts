import { Router } from 'express';

import * as categories_spec from './categories_spec.js';
import * as published_spec from './published_spec.js';
import * as install_spec from './install_spec.js';
import * as uninstall_spec from './uninstall_spec.js';

import * as delete_spec from './delete_spec.js';
import * as detail_spec from './detail_spec.js';
import * as local_spec from './local_spec.js';

export function registerRoutes(router: Router) {
  router.get('/spec/categories', categories_spec.GET);
  router.get('/spec/published', published_spec.GET);
  router.post('/spec/install', install_spec.POST);
  router.post('/spec/uninstall', uninstall_spec.POST);

  router.get('/spec/detail_spec', detail_spec.GET);
  router.get('/spec/local_spec', local_spec.GET);
  router.post('/spec/delete_spec', delete_spec.POST);
}
