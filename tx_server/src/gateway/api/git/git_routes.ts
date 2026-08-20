import { Router } from 'express';

import * as delete_file_git from './delete_file_git.js';
import * as diff_git from './diff_git.js';
import * as discard_untracked_git from './discard_untracked_git.js';
import * as is_repo_git from './is_repo_git.js';
import * as revert_all_git from './revert_all_git.js';
import * as revert_git from './revert_git.js';
import * as status_git from './status_git.js';

export function registerRoutes(router: Router) {
  router.post('/git/delete_file_git', delete_file_git.POST);
  router.get('/git/diff_git', diff_git.GET);
  router.post('/git/discard_untracked_git', discard_untracked_git.POST);
  router.get('/git/is_repo_git', is_repo_git.GET);
  router.post('/git/revert_all_git', revert_all_git.POST);
  router.post('/git/revert_git', revert_git.POST);
  router.get('/git/status_git', status_git.GET);
}
