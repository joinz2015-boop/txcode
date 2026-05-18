import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import * as stream from 'stream';
import * as util from 'util';
import * as http from 'http';
import * as https from 'https';

const pipeline = util.promisify(stream.pipeline);

function logError(msg: string, error: unknown): void {
  console.error(`[deploy.service] ${msg}:`, error);
}

export class DeployService {
  checkReleaseMd(projectPath: string): { exists: boolean; path: string; content?: string } {
    const releasePath = path.join(projectPath, '.txcode', 'release', 'release-zihao', 'RELEASE.md');
    if (fs.existsSync(releasePath)) {
      const content = fs.readFileSync(releasePath, 'utf-8');
      return { exists: true, path: releasePath, content };
    }
    return { exists: false, path: releasePath };
  }

  async downloadFromUrl(url: string, projectPath: string): Promise<{ extractedPath: string }> {
    const releaseDir = path.join(projectPath, '.txcode', 'release');
    if (!fs.existsSync(releaseDir)) {
      fs.mkdirSync(releaseDir, { recursive: true });
    }

    const tempFilePath = path.join(releaseDir, `download_${Date.now()}.tmp`);
    const parsedUrl = new URL(url);
    const isHttps = parsedUrl.protocol === 'https:';

    await new Promise<void>((resolve, reject) => {
      const get = isHttps ? https.get : http.get;
      get(url, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const file = fs.createWriteStream(tempFilePath);
          file.on('finish', () => {
            file.close();
            resolve();
          });
          res.pipe(file);
          return;
        }
        const file = fs.createWriteStream(tempFilePath);
        file.on('finish', () => {
          file.close();
          resolve();
        });
        file.on('error', reject);
        res.pipe(file);
      }).on('error', reject);
    });

    const isTarGz = url.endsWith('.tar.gz') || url.endsWith('.tgz');
    const isMd = url.endsWith('.md');
    const isZip = url.endsWith('.zip');

    const targetDir = path.join(releaseDir, 'release-zihao');
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    if (isMd) {
      fs.renameSync(tempFilePath, path.join(targetDir, 'RELEASE.md'));
      return { extractedPath: path.relative(projectPath, targetDir) };
    } else if (isZip) {
      await this.extractZip(tempFilePath, targetDir);
      this.flattenTargetDir(targetDir);
      fs.unlinkSync(tempFilePath);
      return { extractedPath: path.relative(projectPath, targetDir) };
    } else {
      await this.extractTarGz(tempFilePath, targetDir);
      this.flattenTargetDir(targetDir);
      fs.unlinkSync(tempFilePath);
      return { extractedPath: path.relative(projectPath, targetDir) };
    }
  }

  async uploadArchive(filePath: string, projectPath: string): Promise<{ extractedPath: string }> {
    const releaseDir = path.join(projectPath, '.txcode', 'release');
    if (!fs.existsSync(releaseDir)) {
      fs.mkdirSync(releaseDir, { recursive: true });
    }

    const targetDir = path.join(releaseDir, 'release-zihao');
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const lowerName = filePath.toLowerCase();
    if (lowerName.endsWith('.zip')) {
      await this.extractZip(filePath, targetDir);
    } else {
      await this.extractTarGz(filePath, targetDir);
    }
    this.flattenTargetDir(targetDir);
    fs.unlinkSync(filePath);

    return { extractedPath: path.relative(projectPath, targetDir) };
  }

  private flattenTargetDir(targetDir: string): void {
    const entries = fs.readdirSync(targetDir, { withFileTypes: true });
    const dirs = entries.filter(e => e.isDirectory());
    const files = entries.filter(e => e.isFile());
    if (dirs.length === 1 && files.length === 0) {
      const nestedDir = path.join(targetDir, dirs[0].name);
      const nestedEntries = fs.readdirSync(nestedDir, { withFileTypes: true });
      for (const entry of nestedEntries) {
        const srcPath = path.join(nestedDir, entry.name);
        const dstPath = path.join(targetDir, entry.name);
        fs.renameSync(srcPath, dstPath);
      }
      fs.rmdirSync(nestedDir);
    }
  }

  private async extractZip(filePath: string, targetDir: string): Promise<void> {
    try {
      const { execSync } = await import('child_process');
      if (process.platform === 'win32') {
        execSync(`powershell -command "Expand-Archive -Path '${filePath}' -DestinationPath '${targetDir}' -Force"`, { stdio: 'pipe' });
      } else {
        execSync(`unzip -o "${filePath}" -d "${targetDir}"`, { stdio: 'pipe' });
      }
    } catch (err) {
      logError('system unzip failed, falling back to manual extraction:', err);
      await this.parseZip(filePath, targetDir);
    }
  }

  private async parseZip(filePath: string, targetDir: string): Promise<void> {
    const buffer = fs.readFileSync(filePath);
    let offset = 0;

    while (offset + 4 <= buffer.length) {
      const signature = buffer.readUInt32LE(offset);

      if (signature === 0x04034b50) {
        const fileNameLen = buffer.readUInt16LE(offset + 26);
        const extraLen = buffer.readUInt16LE(offset + 28);
        const compSize = buffer.readUInt32LE(offset + 18);
        const compMethod = buffer.readUInt16LE(offset + 8);
        const name = buffer.toString('utf-8', offset + 30, offset + 30 + fileNameLen);

        const dataOffset = offset + 30 + fileNameLen + extraLen;
        const data = buffer.subarray(dataOffset, dataOffset + compSize);

        if (!name.endsWith('/') && compSize > 0) {
          const filePath = path.join(targetDir, name);
          const fileDir = path.dirname(filePath);
          if (!fs.existsSync(fileDir)) {
            fs.mkdirSync(fileDir, { recursive: true });
          }

          if (compMethod === 0) {
            fs.writeFileSync(filePath, data);
          } else if (compMethod === 8) {
            const decompressed = zlib.inflateRawSync(data);
            fs.writeFileSync(filePath, decompressed);
          }
        }

        offset = dataOffset + compSize;
      } else if (signature === 0x02014b50 || signature === 0x06054b50) {
        break;
      } else {
        offset++;
      }
    }
  }

  private async extractTarGz(filePath: string, targetDir: string): Promise<void> {
    try {
      const { execSync } = await import('child_process');
      execSync(`tar -xzf "${filePath}" -C "${targetDir}"`, { stdio: 'pipe' });
    } catch (err) {
      logError('tar command failed, falling back to manual extraction:', err);
      const fileContent = fs.readFileSync(filePath);
      const decompressed = zlib.gunzipSync(fileContent);
      await this.parseTar(decompressed, targetDir);
    }
  }

  private async parseTar(buffer: Buffer, targetDir: string): Promise<void> {
    let offset = 0;

    while (offset + 512 <= buffer.length) {
      const header = buffer.subarray(offset, offset + 512);

      if (header.every(b => b === 0)) {
        offset += 512;
        continue;
      }

      const name = header.toString('utf-8', 0, 100).replace(/\0/g, '').trim();
      const sizeStr = header.toString('utf-8', 124, 136).replace(/\0/g, '').trim();
      const size = parseInt(sizeStr, 8) || 0;
      const typeFlag = header[156];

      offset += 512;

      if (!name) {
        if (size > 0) {
          offset += Math.ceil(size / 512) * 512;
        }
        continue;
      }

      if (typeFlag === 53) {
        const dirPath = path.join(targetDir, name);
        if (!fs.existsSync(dirPath)) {
          fs.mkdirSync(dirPath, { recursive: true });
        }
        continue;
      }

      if (size > 0) {
        const fileData = buffer.subarray(offset, offset + size);
        const filePath = path.join(targetDir, name);
        const fileDir = path.dirname(filePath);
        if (!fs.existsSync(fileDir)) {
          fs.mkdirSync(fileDir, { recursive: true });
        }
        fs.writeFileSync(filePath, fileData);
      }

      offset += Math.ceil(size / 512) * 512;
    }
  }
}

export const deployService = new DeployService();
