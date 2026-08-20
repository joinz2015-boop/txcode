import { Router } from 'express';

import * as html_design from './html_design.js';

export function registerRoutes(router: Router) {
  router.get('/design/html', html_design.GET);
}
