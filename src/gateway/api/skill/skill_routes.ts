import { Router } from 'express';

import * as create_repo_skill from './create_repo_skill.js';
import * as delete_repo_skill from './delete_repo_skill.js';
import * as detail_skill from './detail_skill.js';
import * as download_repo_skill from './download_repo_skill.js';
import * as list_skill from './list_skill.js';
import * as load_skill from './load_skill.js';
import * as local_skill from './local_skill.js';
import * as prompt_skill from './prompt_skill.js';
import * as repositories_skill from './repositories_skill.js';
import * as sync_repo_skill from './sync_repo_skill.js';
import * as update_repo_skill from './update_repo_skill.js';

export function registerRoutes(router: Router) {
  router.post('/skill/create_repo_skill', create_repo_skill.POST);
  router.post('/skill/delete_repo_skill', delete_repo_skill.POST);
  router.get('/skill/detail_skill', detail_skill.GET);
  router.post('/skill/download_repo_skill', download_repo_skill.POST);
  router.get('/skill/list_skill', list_skill.GET);
  router.post('/skill/load_skill', load_skill.POST);
  router.get('/skill/local_skill', local_skill.GET);
  router.get('/skill/prompt_skill', prompt_skill.GET);
  router.get('/skill/repositories_skill', repositories_skill.GET);
  router.post('/skill/sync_repo_skill', sync_repo_skill.POST);
  router.post('/skill/update_repo_skill', update_repo_skill.POST);
}
