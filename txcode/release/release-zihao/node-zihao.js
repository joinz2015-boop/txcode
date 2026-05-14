const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const zlib = require('zlib');

const DEFAULT_CHUNK_SIZE = 1024 * 1024;

function toOctal(num, len) {
  return num.toString(8).padStart(len - 1, '0') + '\0';
}

function padBuffer(buf, size) {
  if (buf.length >= size) return buf.subarray(0, size);
  const padded = Buffer.alloc(size);
  buf.copy(padded);
  return padded;
}

function buildTarHeader(name, size, typeflag) {
  const header = Buffer.alloc(512);
  const nameBuf = Buffer.from(name, 'utf-8');

  if (nameBuf.length > 100) {
    throw new Error(`文件名过长(>100): ${name}`);
  }

  nameBuf.copy(header, 0);
  const mode = toOctal(0o644, 8);
  Buffer.from(mode).copy(header, 100);
  const uid = toOctal(0, 8);
  Buffer.from(uid).copy(header, 108);
  const gid = toOctal(0, 8);
  Buffer.from(gid).copy(header, 116);
  const sizeOct = toOctal(size, 12);
  Buffer.from(sizeOct).copy(header, 124);
  const mtime = toOctal(Math.floor(Date.now() / 1000), 12);
  Buffer.from(mtime).copy(header, 136);
  header[156] = typeflag.charCodeAt(0);
  Buffer.from('ustar\0').copy(header, 257);
  Buffer.from('00').copy(header, 263);

  for (let i = 148; i < 156; i++) header[i] = 32;
  let checksum = 0;
  for (let i = 0; i < 512; i++) checksum += header[i];
  const checksumOct = toOctal(checksum, 7);
  Buffer.from(checksumOct).copy(header, 148);
  header[155] = 0;

  return header;
}

function collectFiles(dir, baseDir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
    if (entry.isDirectory()) {
      results.push({ name: relativePath + '/', size: 0, type: '5', fullPath });
      results.push(...collectFiles(fullPath, baseDir));
    } else if (entry.isFile()) {
      const stat = fs.statSync(fullPath);
      results.push({ name: relativePath, size: stat.size, type: '0', fullPath });
    }
  }
  return results;
}

async function packProject(projectDir, outputPath) {
  const absDir = path.resolve(projectDir);
  if (!fs.existsSync(absDir)) {
    throw new Error(`目录不存在: ${absDir}`);
  }

  console.log(`[pack] 打包目录: ${absDir}`);

  return new Promise((resolve, reject) => {
    const gzip = zlib.createGzip();
    const outStream = fs.createWriteStream(outputPath);
    const pipe = gzip.pipe(outStream);

    const files = collectFiles(absDir, absDir);
    let totalSize = 0;

    files.sort((a, b) => a.name.localeCompare(b.name));

    for (const file of files) {
      const header = buildTarHeader(file.name, file.size, file.type);
      gzip.write(header);
      totalSize += 512;

      if (file.type === '0' && file.size > 0) {
        const content = fs.readFileSync(file.fullPath);
        gzip.write(content);
        totalSize += file.size;
        const padding = (512 - (file.size % 512)) % 512;
        if (padding > 0) {
          gzip.write(Buffer.alloc(padding));
          totalSize += padding;
        }
      }
    }

    const endBlock = Buffer.alloc(1024);
    gzip.write(endBlock);
    gzip.end();

    pipe.on('finish', () => {
      const finalSize = fs.statSync(outputPath).size;
      console.log(`[pack] 打包完成: ${outputPath} (${(finalSize / 1024).toFixed(1)}KB)`);
      resolve(outputPath);
    });

    pipe.on('error', reject);
  });
}

async function login(url, username, password) {
  const res = await fetch(`${url.replace(/\/$/, '')}/api/user/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const json = await res.json();
  if (json.code !== 200 || !json.data?.token) {
    throw new Error(json.message || '登录失败');
  }
  return json.data.token;
}

async function createVersion(url, token, projectName) {
  const res = await fetch(`${url.replace(/\/$/, '')}/api/version/create_version`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ project_name: projectName })
  });
  const json = await res.json();
  if (json.code !== 200) {
    throw new Error(json.message || '创建版本失败');
  }
  return json.data;
}

async function uploadVersion(url, token, versionId, filePath, chunkSize = DEFAULT_CHUNK_SIZE) {
  const baseUrl = url.replace(/\/$/, '');
  const fileBuffer = fs.readFileSync(filePath);
  const fileSize = fileBuffer.length;
  const totalChunks = Math.ceil(fileSize / chunkSize);
  const fileHash = crypto.createHash('md5').update(fileBuffer).digest('hex');

  console.log(`[upload] 文件大小: ${(fileSize / 1024 / 1024).toFixed(2)}MB, 分片数: ${totalChunks}, 每片: ${(chunkSize / 1024).toFixed(0)}KB`);

  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, fileSize);
    const chunk = fileBuffer.subarray(start, end);

    const formData = new FormData();
    formData.append('version_id', String(versionId));
    formData.append('chunk_index', String(i));
    formData.append('total_chunks', String(totalChunks));
    if (i === totalChunks - 1) {
      formData.append('file_hash', fileHash);
    }
    formData.append('file', new Blob([chunk]), `chunk_${i}`);

    const res = await fetch(`${baseUrl}/api/version/upload_version`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });
    const json = await res.json();
    if (json.code !== 200) {
      throw new Error(json.message || `分片 ${i + 1}/${totalChunks} 上传失败`);
    }

    const data = json.data;
    if (data.merged) {
      console.log(`[upload] 完成: 分片 ${data.received}/${data.total}, 已合并, 路径: ${data.file_path}`);
    } else {
      process.stdout.write(`\r[upload] 进度: ${data.received}/${data.total}`);
    }
  }
  console.log('');
}

async function publishVersion(url, token, versionId) {
  const res = await fetch(`${url.replace(/\/$/, '')}/api/version/publish_version`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ version_id: versionId })
  });
  const json = await res.json();
  if (json.code !== 200) {
    throw new Error(json.message || '发布失败');
  }
  return json.data;
}

async function queryVersion(url, token, projectName, status) {
  const baseUrl = url.replace(/\/$/, '');
  const params = new URLSearchParams();
  if (projectName) params.append('project_name', projectName);
  if (status) params.append('status', status);
  const query = params.toString();
  const apiPath = query ? `/api/version/query_version?${query}` : '/api/version/query_version';

  const res = await fetch(`${baseUrl}${apiPath}`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const json = await res.json();
  if (json.code !== 200) {
    throw new Error(json.message || '查询版本失败');
  }
  return json.data;
}

async function deploy(url, username, password, projectName, filePath) {
  console.log('[deploy] 开始部署...');
  console.log(`[deploy] 平台: ${url}, 项目: ${projectName}, 路径: ${filePath}`);

  let targetPath = filePath;
  let needCleanup = false;

  const stat = fs.statSync(filePath);
  if (stat.isDirectory()) {
    targetPath = path.join(path.dirname(filePath), `release-${Date.now()}.tar.gz`);
    console.log('[deploy] 0/5 打包项目...');
    await packProject(filePath, targetPath);
    needCleanup = true;
    console.log('[deploy] 1/5 登录...');
  } else {
    console.log('[deploy] 1/4 登录...');
  }

  const token = await login(url, username, password);
  console.log('[deploy] 登录成功');

  const step2 = needCleanup ? '2/5' : '2/4';
  const step3 = needCleanup ? '3/5' : '3/4';
  const step4 = needCleanup ? '4/5' : '4/4';

  console.log(`[deploy] ${step2} 创建版本...`);
  const version = await createVersion(url, token, projectName);
  console.log(`[deploy] 版本创建: id=${version.id}, version_no=${version.version_no}`);

  console.log(`[deploy] ${step3} 上传版本包...`);
  await uploadVersion(url, token, version.id, targetPath);

  console.log(`[deploy] ${step4} 发布版本...`);
  await publishVersion(url, token, version.id);

  if (needCleanup) {
    try { fs.unlinkSync(targetPath); } catch {}
  }

  console.log(`[deploy] 部署完成! 版本: ${version.version_no}`);
}

module.exports = {
  packProject,
  login,
  createVersion,
  uploadVersion,
  publishVersion,
  queryVersion,
  deploy
};

if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length < 4) {
    console.error('用法: node node-zihao.js <url> <username> <password> <projectName> <fileOrDir>');
    console.error('示例: node node-zihao.js http://zihao.homecommunity.cn zihao 123456 my-app ./release.tar.gz');
    console.error('示例: node node-zihao.js http://zihao.homecommunity.cn zihao 123456 my-app ./my-project  (传入目录自动打包)');
    process.exit(1);
  }
  const [url, username, password, projectName, filePath] = args;
  deploy(url, username, password, projectName, filePath).catch(err => {
    console.error('[deploy] 失败:', err.message);
    process.exit(1);
  });
}
