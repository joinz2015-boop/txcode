import * as fs from 'fs';
import * as path from 'path';

export function getMimeFromPath(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const mimeMap: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.bmp': 'image/bmp',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.tiff': 'image/tiff',
    '.tif': 'image/tiff',
  };
  return mimeMap[ext] || 'image/png';
}

export async function resolveImageUrl(url: string): Promise<string> {
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }

  try {
    if (!fs.existsSync(url)) {
      return url;
    }
    const buffer = fs.readFileSync(url);
    const base64 = buffer.toString('base64');
    const mime = getMimeFromPath(url);
    return `data:${mime};base64,${base64}`;
  } catch {
    return url;
  }
}
