import { Router } from 'express';

import * as browse_file from './browse_file.js';
import * as content_file from './content_file.js';
import * as delete_file from './delete_file.js';
import * as download_file from './download_file.js';
import * as drives_file from './drives_file.js';
import * as edit_file from './edit_file.js';
import * as mkdir_file from './mkdir_file.js';
import * as rename_file from './rename_file.js';
import * as tree_file from './tree_file.js';
import * as upload_chunk_file from './upload_chunk_file.js';
import * as upload_file from './upload_file.js';
import * as upload_merge_file from './upload_merge_file.js';
import * as write_file from './write_file.js';

export function registerRoutes(router: Router) {
  router.get('/file/browse_file', browse_file.GET);
  router.get('/file/content_file', content_file.GET);
  router.post('/file/delete_file', delete_file.POST);
  router.get('/file/download_file', download_file.GET);
  router.get('/file/drives_file', drives_file.GET);
  router.post('/file/edit_file', edit_file.POST);
  router.post('/file/mkdir_file', mkdir_file.POST);
  router.post('/file/rename_file', rename_file.POST);
  router.get('/file/tree_file', tree_file.GET);
  router.post('/file/upload_chunk_file', upload_chunk_file.POST);
  router.post('/file/upload_file', upload_file.POST);
  router.post('/file/upload_merge_file', upload_merge_file.POST);
  router.post('/file/write_file', write_file.POST);
}
