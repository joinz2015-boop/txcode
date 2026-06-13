import { Router } from 'express';

import * as queue_gateway from './queue_gateway.js';
import * as waf_config_gateway from './waf_config_gateway.js';
import * as waf_start_gateway from './waf_start_gateway.js';
import * as waf_status_gateway from './waf_status_gateway.js';
import * as waf_stop_gateway from './waf_stop_gateway.js';
import * as waf_update_gateway from './waf_update_gateway.js';

export function registerRoutes(router: Router) {
  router.get('/gateway/queue_gateway', queue_gateway.GET);
  router.get('/gateway/waf_config_gateway', waf_config_gateway.GET);
  router.post('/gateway/waf_start_gateway', waf_start_gateway.POST);
  router.get('/gateway/waf_status_gateway', waf_status_gateway.GET);
  router.post('/gateway/waf_stop_gateway', waf_stop_gateway.POST);
  router.post('/gateway/waf_update_gateway', waf_update_gateway.POST);
}
