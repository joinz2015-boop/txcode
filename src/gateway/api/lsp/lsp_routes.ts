import { Router } from 'express';

import * as download_lsp from './download_lsp.js';
import * as java_version_lsp from './java_version_lsp.js';
import * as servers_lsp from './servers_lsp.js';
import * as start_lsp from './start_lsp.js';
import * as status_lsp from './status_lsp.js';
import * as stop_lsp from './stop_lsp.js';
import * as update_lsp from './update_lsp.js';

export function registerRoutes(router: Router) {
  router.post('/lsp/download_lsp', download_lsp.POST);
  router.get('/lsp/java_version_lsp', java_version_lsp.GET);
  router.get('/lsp/servers_lsp', servers_lsp.GET);
  router.post('/lsp/start_lsp', start_lsp.POST);
  router.get('/lsp/status_lsp', status_lsp.GET);
  router.post('/lsp/stop_lsp', stop_lsp.POST);
  router.post('/lsp/update_lsp', update_lsp.POST);
}
