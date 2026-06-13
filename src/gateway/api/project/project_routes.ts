import { Router } from 'express';

import * as activate_project from './activate_project.js';
import * as content_project from './content_project.js';
import * as create_project from './create_project.js';
import * as current_project from './current_project.js';
import * as files_project from './files_project.js';
import * as list_project from './list_project.js';
import * as set_current_project from './set_current_project.js';

export function registerRoutes(router: Router) {
  router.post('/project/activate_project', activate_project.POST);
  router.get('/project/content_project', content_project.GET);
  router.post('/project/create_project', create_project.POST);
  router.get('/project/current_project', current_project.GET);
  router.get('/project/files_project', files_project.GET);
  router.get('/project/list_project', list_project.GET);
  router.post('/project/set_current_project', set_current_project.POST);
}
