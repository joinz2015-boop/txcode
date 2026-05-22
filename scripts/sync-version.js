import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf-8'));
const distConfigPath = join(root, 'dist', 'config', 'tx.config.js');

let content = readFileSync(distConfigPath, 'utf-8');
content = content.replace(/__VERSION__/g, pkg.version);
writeFileSync(distConfigPath, content, 'utf-8');

console.log(`Version synced: ${pkg.version} → dist/config/tx.config.js`);
