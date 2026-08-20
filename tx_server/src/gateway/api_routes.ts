import { Router } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function importModule(filePath: string): Promise<Record<string, unknown>> {
  const fileUrl = pathToFileURL(filePath).href;
  return await import(fileUrl);
}

function scanRoutesFiles(dir: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...scanRoutesFiles(fullPath));
    } else if (entry.isFile() && /_routes\.(ts|js)$/.test(entry.name)) {
      results.push(fullPath);
    }
  }
  return results;
}

export async function registerAllRoutes(app: { use: (path: string, router: Router) => void }) {
  const apiRouter = Router();
  const apiDir = path.join(__dirname, 'api');
  const files = scanRoutesFiles(apiDir);

  let registered = 0;
  for (const filePath of files) {
    try {
      const mod = await importModule(filePath);
      if (mod.registerRoutes) {
        (mod.registerRoutes as (router: Router) => void)(apiRouter);
        registered++;
      }
    } catch (err: any) {
      console.error(`[api_routes] Failed loading routes from ${filePath}:`, err.message);
    }
  }

  app.use('/api', apiRouter);
  console.log(`[api_routes] Registered ${registered} route modules from ${files.length} _routes.ts files`);
  return apiRouter;
}
