import { Router } from 'express';

import * as create_model_config from './create_model_config.js';
import * as create_provider_config from './create_provider_config.js';
import * as delete_model_config from './delete_model_config.js';
import * as delete_provider_config from './delete_provider_config.js';
import * as detail_provider_config from './detail_provider_config.js';
import * as export_config from './export_config.js';
import * as get_config from './get_config.js';
import * as import_config from './import_config.js';
import * as list_models_config from './list_models_config.js';
import * as list_providers_config from './list_providers_config.js';
import * as proxy_config from './proxy_config.js';
import * as set_config from './set_config.js';
import * as set_default_provider_config from './set_default_provider_config.js';
import * as update_model_config from './update_model_config.js';
import * as update_provider_config from './update_provider_config.js';

export function registerRoutes(router: Router) {
  router.post('/sys_config/create_model_config', create_model_config.POST);
  router.post('/sys_config/create_provider_config', create_provider_config.POST);
  router.post('/sys_config/delete_model_config', delete_model_config.POST);
  router.post('/sys_config/delete_provider_config', delete_provider_config.POST);
  router.get('/sys_config/detail_provider_config', detail_provider_config.GET);
  router.get('/sys_config/export_config', export_config.GET);
  router.get('/sys_config/get_config', get_config.GET);
  router.post('/sys_config/import_config', import_config.POST);
  router.get('/sys_config/list_models_config', list_models_config.GET);
  router.get('/sys_config/list_providers_config', list_providers_config.GET);
  router.get('/sys_config/proxy_config', proxy_config.GET);
  router.post('/sys_config/proxy_config', proxy_config.POST);
  router.post('/sys_config/set_config', set_config.POST);
  router.post('/sys_config/set_default_provider_config', set_default_provider_config.POST);
  router.post('/sys_config/update_model_config', update_model_config.POST);
  router.post('/sys_config/update_provider_config', update_provider_config.POST);
}
