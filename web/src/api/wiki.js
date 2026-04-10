/**
 * Wiki API
 */

import { request } from './index.js';

export const wikiApi = {
  getMenu() {
    return request('GET', '/wiki/menu');
  },

  getContent(path) {
    return request('GET', `/wiki/content?path=${encodeURIComponent(path)}`);
  },

  getAsset(path) {
    return `/api/wiki/asset?path=${encodeURIComponent(path)}`;
  }
};
