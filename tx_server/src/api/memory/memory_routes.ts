import { Router } from 'express';

import * as get_memory from './get_memory.js';
import * as save_memory from './save_memory.js';

export function registerRoutes(router: Router) {
  router.get('/memory/get_memory', get_memory.GET);
  router.post('/memory/save_memory', save_memory.POST);
}
