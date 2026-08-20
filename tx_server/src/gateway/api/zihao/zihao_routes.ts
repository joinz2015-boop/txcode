import { Router } from 'express';

import * as config_zihao from './config_zihao.js';
import * as save_config_zihao from './save_config_zihao.js';
import * as delete_config_zihao from './delete_config_zihao.js';
import * as active_config_zihao from './active_config_zihao.js';
import * as connect_zihao from './connect_zihao.js';
import * as browse_zihao from './browse_zihao.js';
import * as view_zihao from './view_zihao.js';
import * as create_zihao from './create_zihao.js';
import * as rename_zihao from './rename_zihao.js';
import * as delete_zihao from './delete_zihao.js';
import * as save_content_zihao from './save_content_zihao.js';
import * as home_dir_zihao from './home_dir_zihao.js';
import * as chunk_upload_zihao from './chunk_upload_zihao.js';
import * as download_zihao from './download_zihao.js';

export function registerRoutes(router: Router) {
  router.get('/zihao/config', config_zihao.GET);
  router.post('/zihao/config', save_config_zihao.POST);
  router.post('/zihao/config/delete', delete_config_zihao.POST);
  router.post('/zihao/config/active', active_config_zihao.POST);
  router.post('/zihao/connect', connect_zihao.POST);
  router.get('/zihao/browse', browse_zihao.GET);
  router.get('/zihao/view', view_zihao.GET);
  router.post('/zihao/create', create_zihao.POST);
  router.post('/zihao/rename', rename_zihao.POST);
  router.post('/zihao/delete', delete_zihao.POST);
  router.post('/zihao/save-content', save_content_zihao.POST);
  router.get('/zihao/home-dir', home_dir_zihao.GET);
  router.post('/zihao/chunk-upload', chunk_upload_zihao.POST);
  router.get('/zihao/download', download_zihao.GET);
}
