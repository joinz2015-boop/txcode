import { Router } from 'express';

import * as asset_wiki from './asset_wiki.js';
import * as content_wiki from './content_wiki.js';
import * as menu_wiki from './menu_wiki.js';

export function registerRoutes(router: Router) {
  router.get('/wiki/asset_wiki', asset_wiki.GET);
  router.get('/wiki/content_wiki', content_wiki.GET);
  router.get('/wiki/menu_wiki', menu_wiki.GET);
}
