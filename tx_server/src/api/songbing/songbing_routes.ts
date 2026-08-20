import { Router } from 'express';

import * as config_songbing from './config_songbing.js';
import * as save_config_songbing from './save_config_songbing.js';
import * as auth_start_songbing from './auth_start_songbing.js';
import * as auth_verify_songbing from './auth_verify_songbing.js';
import * as auth_cancel_songbing from './auth_cancel_songbing.js';
import * as sync_models_songbing from './sync_models_songbing.js';

export function registerRoutes(router: Router) {
  router.get('/songbing/config_songbing', config_songbing.GET);
  router.post('/songbing/config_songbing', save_config_songbing.POST);
  router.post('/songbing/auth_start_songbing', auth_start_songbing.POST);
  router.post('/songbing/auth_verify_songbing', auth_verify_songbing.POST);
  router.post('/songbing/auth_cancel_songbing', auth_cancel_songbing.POST);
  router.post('/songbing/sync_models_songbing', sync_models_songbing.POST);
}
