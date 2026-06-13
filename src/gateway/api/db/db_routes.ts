import { Router } from 'express';

import * as data_db from './data_db.js';
import * as schema_db from './schema_db.js';
import * as tables_db from './tables_db.js';

export function registerRoutes(router: Router) {
  router.get('/db/data_db', data_db.GET);
  router.get('/db/schema_db', schema_db.GET);
  router.get('/db/tables_db', tables_db.GET);
}
