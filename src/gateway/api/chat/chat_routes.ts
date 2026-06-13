import { Router } from 'express';

import * as command_chat from './command_chat.js';
import * as history_chat from './history_chat.js';
import * as send_chat from './send_chat.js';
import * as upload_image_chat from './upload_image_chat.js';
import * as file_download from './file_download.js';

export function registerRoutes(router: Router) {
  router.post('/chat/command_chat', command_chat.POST);
  router.get('/chat/history_chat', history_chat.GET);
  router.post('/chat/send_chat', send_chat.POST);
  router.post('/chat/upload_image_chat', upload_image_chat.POST);
  router.get('/chat/file_download', file_download.GET);
}
