import { Router } from 'express';

import * as categories_skill from './categories_skill.js';
import * as published_skill from './published_skill.js';
import * as install_skill from './install_skill.js';
import * as uninstall_skill from './uninstall_skill.js';

import * as detail_skill from './detail_skill.js';
import * as list_skill from './list_skill.js';
import * as load_skill from './load_skill.js';
import * as local_skill from './local_skill.js';
import * as prompt_skill from './prompt_skill.js';

export function registerRoutes(router: Router) {
  router.get('/skill/categories', categories_skill.GET);
  router.get('/skill/published', published_skill.GET);
  router.post('/skill/install', install_skill.POST);
  router.post('/skill/uninstall', uninstall_skill.POST);

  router.get('/skill/detail_skill', detail_skill.GET);
  router.get('/skill/list_skill', list_skill.GET);
  router.post('/skill/load_skill', load_skill.POST);
  router.get('/skill/local_skill', local_skill.GET);
  router.get('/skill/prompt_skill', prompt_skill.GET);
}
