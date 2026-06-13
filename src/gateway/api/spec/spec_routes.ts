import { Router } from 'express';

import * as create_repo_spec from './create_repo_spec.js';
import * as delete_repo_spec from './delete_repo_spec.js';
import * as delete_spec from './delete_spec.js';
import * as detail_spec from './detail_spec.js';
import * as download_repo_spec from './download_repo_spec.js';
import * as inject_spec from './inject_spec.js';
import * as injection_spec from './injection_spec.js';
import * as local_spec from './local_spec.js';
import * as repositories_spec from './repositories_spec.js';
import * as sync_repo_spec from './sync_repo_spec.js';
import * as update_repo_spec from './update_repo_spec.js';
import * as upload_spec from './upload_spec.js';

export function registerRoutes(router: Router) {
  router.post('/spec/create_repo_spec', create_repo_spec.POST);
  router.post('/spec/delete_repo_spec', delete_repo_spec.POST);
  router.post('/spec/delete_spec', delete_spec.POST);
  router.get('/spec/detail_spec', detail_spec.GET);
  router.post('/spec/download_repo_spec', download_repo_spec.POST);
  router.post('/spec/inject_spec', inject_spec.POST);
  router.get('/spec/injection_spec', injection_spec.GET);
  router.get('/spec/local_spec', local_spec.GET);
  router.get('/spec/repositories_spec', repositories_spec.GET);
  router.post('/spec/sync_repo_spec', sync_repo_spec.POST);
  router.post('/spec/update_repo_spec', update_repo_spec.POST);
  router.post('/spec/upload_spec', upload_spec.POST);
}
