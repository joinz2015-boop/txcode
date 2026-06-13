import { Router } from 'express';

import * as config_dingtalk from './config_dingtalk.js';
import * as start_dingtalk from './start_dingtalk.js';
import * as status_dingtalk from './status_dingtalk.js';
import * as stop_dingtalk from './stop_dingtalk.js';

export function registerRoutes(router: Router) {
  router.get('/dingtalk/config_dingtalk', config_dingtalk.GET);
  router.post('/dingtalk/config_dingtalk', config_dingtalk.POST);
  router.post('/dingtalk/start_dingtalk', start_dingtalk.POST);
  router.get('/dingtalk/status_dingtalk', status_dingtalk.GET);
  router.post('/dingtalk/stop_dingtalk', stop_dingtalk.POST);
}
