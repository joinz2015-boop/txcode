import { Router } from 'express';

import * as register_webview from './register_webview.js';
import * as release_webview from './release_webview.js';

export function registerRoutes(router: Router) {
  router.post('/test/webview/register', register_webview.POST);
  router.post('/test/webview/release', release_webview.POST);
}
