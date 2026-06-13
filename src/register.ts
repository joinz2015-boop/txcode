import { Router, Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EXCLUDED_FILES = ['index.ts', 'api.types.ts', 'register.ts'];
const EXCLUDED_DIRS = ['websocket'];

async function importModule(filePath: string): Promise<Record<string, unknown>> {
  const fileUrl = pathToFileURL(filePath).href;
  return await import(fileUrl);
}

function scanDir(dir: string): string[] {
  const results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!EXCLUDED_DIRS.includes(entry.name)) {
        results.push(...scanDir(fullPath));
      }
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.js'))) {
      if (!EXCLUDED_FILES.includes(entry.name)) {
        results.push(fullPath);
      }
    }
  }

  return results;
}

export async function registerRoutes(): Promise<Router> {
  const router = Router();
  const apiDir = path.join(__dirname, 'api');

  if (!fs.existsSync(apiDir)) {
    console.warn('[register] api/ directory not found:', apiDir);
    return router;
  }

  const files = scanDir(apiDir);
  let registered = 0;

  for (const filePath of files) {
    const relativePath = path.relative(apiDir, filePath);
    const routePath = '/' + relativePath
      .replace(/\.(ts|js)$/, '')
      .replace(/\\/g, '/');

    try {
      const mod = await importModule(filePath);
      if (mod.GET) {
        router.get(routePath, mod.GET as (req: Request, res: Response) => void);
        registered++;
      }
      if (mod.POST) {
        router.post(routePath, mod.POST as (req: Request, res: Response) => void);
        registered++;
      }
    } catch (err: any) {
      console.error(`[register] Failed loading route ${routePath}:`, err.message);
    }
  }

  console.log(`[register] Auto-registered ${registered} handlers from ${files.length} route files`);
  return router;
}
