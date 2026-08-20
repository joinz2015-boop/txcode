import { Router } from 'express';

import * as check_release_deploy from './check_release_deploy.js';
import * as download_url_deploy from './download_url_deploy.js';
import * as upload_archive_deploy from './upload_archive_deploy.js';

export function registerRoutes(router: Router) {
  router.get('/deploy/check_release_deploy', check_release_deploy.GET);
  router.post('/deploy/download_url_deploy', download_url_deploy.POST);
  router.post('/deploy/upload_archive_deploy', upload_archive_deploy.POST);
}
