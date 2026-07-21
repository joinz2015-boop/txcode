import { Router } from 'express';

import * as list_plugin_webshell_host from './list_plugin_webshell_host.js';
import * as detail_plugin_webshell_host from './detail_plugin_webshell_host.js';
import * as create_plugin_webshell_host from './create_plugin_webshell_host.js';
import * as update_plugin_webshell_host from './update_plugin_webshell_host.js';
import * as delete_plugin_webshell_host from './delete_plugin_webshell_host.js';
import * as test_plugin_webshell_host from './test_plugin_webshell_host.js';

export function registerRoutes(router: Router) {
  router.get('/plugin-webshell-host', list_plugin_webshell_host.GET);
  router.get('/plugin-webshell-host/detail', detail_plugin_webshell_host.GET);
  router.post('/plugin-webshell-host', create_plugin_webshell_host.POST);
  router.post('/plugin-webshell-host/update', update_plugin_webshell_host.POST);
  router.post('/plugin-webshell-host/delete', delete_plugin_webshell_host.POST);
  router.post('/plugin-webshell-host/test', test_plugin_webshell_host.POST);
}
