---
name: release-zihao
description: 梓豪平台部署发布技能。打包项目为tar.gz，登录梓豪平台获取token，创建版本号，分片上传版本包，发布版本到梓豪平台。适用于将本地项目部署到梓豪平台的自动化流程。
license: MIT
compatibility: txcode
metadata:
  audience: developers
  workflow: txcode
---

## 一、职责范围

将本地项目部署到梓豪平台，全流程自动化：打包 → 登录 → 创建版本 → 上传 → 发布。

### 使用场景
- 需要将本地项目部署到梓豪平台时
- 创建新版本并发布

---

## 二、梓豪平台信息

| 项目 | 值 |
|------|-----|
| 地址 | `http://zihao.homecommunity.cn` |
| 用户名 | `zihao` |
| 密码 | `123456` |
| 项目名称 | HC项目 |
| 认证方式 | `Authorization: Bearer {token}` |

---

## 三、一键部署（推荐）

直接运行脚本，传入项目目录或打包文件：

```bash
# 方式1：传入项目目录（自动打包为 tar.gz 后部署）
node txcode/release/release-zihao/node-zihao.js \
  http://zihao.homecommunity.cn \
  zihao 123456 \
  <项目名称> \
  <项目目录>

# 方式2：传入已打包的 .tar.gz 文件
node txcode/release/release-zihao/node-zihao.js \
  http://zihao.homecommunity.cn \
  zihao 123456 \
  <项目名称> \
  <release.tar.gz>
```

部署流程：`打包 → 登录 → 创建版本 → 分片上传(1MB/片) → 发布版本`

版本状态流转：`created → uploaded → pending_release → released`

---

## 四、编译当前项目
应该进入到web 项目做 npm run build 
然后再根目录 执行npm run build 
将dist 打包成txcode.tar.gz ,将这个包发布到梓豪平台
```bash
cd web && npm run build
npm run build
```

## 五、注意事项

- 项目名称需在梓豪平台上已存在
- 传入目录时自动使用纯 Node.js 打包，跨平台兼容，无需系统 tar 命令
- 上传采用分片机制，每片 1MB
- 仅 `created` 或 `uploaded` 状态可发布
- token 有效期有限，长时间操作可能需重新登录

---

## 六、底层参考

详细的 API 接口文档和 node-zihao.js 方法说明见 [zihao.md](./zihao.md)。
