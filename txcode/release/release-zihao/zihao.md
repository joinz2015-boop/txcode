# node-zihao.js 技术参考

> 梓豪平台部署脚本底层说明，包含 API 接口详情和方法参考。

---

## 一、API 接口说明

### 1.1 统一规范

- 基础URL：`http://zihao.homecommunity.cn`
- 认证方式：`Authorization: Bearer {token}`
- 响应格式：`{code: 200, message: "...", data: {...}}`

### 1.2 接口列表

| 接口 | 方法 | 路径 | Content-Type |
|------|------|------|-------------|
| 登录 | POST | `/api/user/login` | application/json |
| 新建版本 | POST | `/api/version/create_version` | application/json |
| 分片上传 | POST | `/api/version/upload_version` | multipart/form-data |
| 查询版本 | GET | `/api/version/query_version` | - |
| 发布版本 | POST | `/api/version/publish_version` | application/json |

### 1.3 接口详情

#### 登录
```
POST /api/user/login
Body: {"username": "xxx", "password": "xxx"}
Response: {"code": 200, "data": {"token": "xxx"}}
```

#### 新建版本
```
POST /api/version/create_version
Body: {"project_name": "my-app"}
Response: {"code": 200, "data": {"id": 100, "project_id": 1, "version_no": "20260105143022", "status": "created"}}
```

#### 分片上传版本包
```
POST /api/version/upload_version (multipart/form-data)
FormData:
  version_id: int      # 版本ID
  chunk_index: int     # 分片序号，从0开始
  total_chunks: int    # 总分片数
  file_hash: string    # 完整文件MD5（最后一片可选，用于校验）
  file: File           # 当前分片文件数据

中间响应: {"code": 200, "data": {"chunk_index": 2, "received": 3, "total": 10}}
最终响应: {"code": 200, "data": {"chunk_index": 9, "received": 10, "total": 10, "merged": true, "file_path": "...", "file_size": 10485760}}
```

推荐分片大小：1MB（1024 × 1024 字节）。

#### 发布版本
```
POST /api/version/publish_version
Body: {"version_id": 100}
Response: {"code": 200, "message": "发布成功", "data": {"message": "发布成功"}}
```

#### 查询版本
```
GET /api/version/query_version?project_name=my-app&status=released
Response: {"code": 200, "data": [{...}]}
```

---

## 二、node-zihao.js 方法参考

### 2.1 引入方式

```javascript
const {
  packProject,
  login,
  createVersion,
  uploadVersion,
  publishVersion,
  queryVersion,
  deploy
} = require('./node-zihao.js');
```

### 2.2 方法列表

| 方法 | 参数 | 返回值 |
|------|------|--------|
| `packProject(projectDir, outputPath)` | 项目目录路径、输出 .tar.gz 路径 | `Promise<string>` 输出文件路径 |
| `login(url, username, password)` | 平台地址、用户名、密码 | `Promise<string>` token |
| `createVersion(url, token, projectName)` | 平台地址、token、项目名 | `Promise<{id, project_id, version_no, status}>` |
| `uploadVersion(url, token, versionId, filePath, chunkSize?)` | 平台地址、token、版本ID、文件路径、分片大小(默认1MB) | `Promise<void>` |
| `publishVersion(url, token, versionId)` | 平台地址、token、版本ID | `Promise<{message}>` |
| `queryVersion(url, token, projectName?, status?)` | 平台地址、token、项目名(可选)、状态(可选) | `Promise<Array>` |
| `deploy(url, username, password, projectName, filePath)` | 一键部署，filePath 支持目录（自动打包）或 .tar.gz 文件 | `Promise<void>` |

### 2.3 分步调用示例

```javascript
const {
  packProject,
  login,
  createVersion,
  uploadVersion,
  publishVersion
} = require('./node-zihao.js');

async function main() {
  const BASE = 'http://zihao.homecommunity.cn';

  // 0. 打包项目（纯 Node.js，跨平台）
  const tarball = await packProject('./my-project', './release.tar.gz');
  console.log('打包完成:', tarball);

  // 1. 登录
  const token = await login(BASE, 'zihao', '123456');
  console.log('登录成功');

  // 2. 创建版本
  const version = await createVersion(BASE, token, 'my-app');
  console.log('版本创建:', version.version_no);

  // 3. 上传
  await uploadVersion(BASE, token, version.id, tarball);
  console.log('上传完成');

  // 4. 发布
  await publishVersion(BASE, token, version.id);
  console.log('发布成功');
}

main();
```

### 2.4 CLI 用法

```bash
# 部署 .tar.gz 文件
node node-zihao.js http://zihao.homecommunity.cn zihao 123456 my-app ./release.tar.gz

# 部署项目目录（自动打包）
node node-zihao.js http://zihao.homecommunity.cn zihao 123456 my-app ./my-project
```
