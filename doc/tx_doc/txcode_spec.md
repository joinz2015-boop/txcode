# TxCode Hub — Spec 公共接口文档

Spec（规范）模块的公开接口（PUBLIC，无需登录）。

---

## 1. 规范分类列表

获取所有规范分类列表。

### 请求

- **方法**: GET
- **路径**: `/api/spec_category/list_spec_category`
- **角色**: PUBLIC

### 参数

无

### 响应

```json
{
  "code": 200,
  "message": "success",
  "data": [
    {
      "id": 1,
      "name": "代码风格",
      "color": "#3b82f6",
      "description": "代码风格规范",
      "sort_order": 1,
      "status": 1,
      "is_system": 1,
      "created_at": "2026-01-01 00:00:00",
      "updated_at": "2026-01-01 00:00:00"
    },
    {
      "id": 2,
      "name": "Git 规范",
      "color": "#06b6d4",
      "description": "Git 提交规范",
      "sort_order": 2,
      "status": 1,
      "is_system": 1,
      "created_at": "2026-01-01 00:00:00",
      "updated_at": "2026-01-01 00:00:00"
    }
  ]
}
```

### 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| id | int | 分类 ID |
| name | string | 分类名称 |
| color | string | 颜色值（十六进制，如 `#3b82f6`） |
| description | string | 分类描述（可能为 null） |
| sort_order | int | 排序序号 |
| status | int | 状态（1=启用） |
| is_system | int | 是否系统内置（1=是，0=否） |

---

## 2. 规范公共列表

获取已发布的规范列表，支持分页、搜索和分类筛选。

### 请求

- **方法**: GET
- **路径**: `/api/spec/list_published_spec`
- **角色**: PUBLIC

### 参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | int | 否 | 页码，默认 1 |
| page_size | int | 否 | 每页条数，默认 10，最大 100 |
| keyword | string | 否 | 搜索关键字（模糊匹配名称和描述） |
| platform_category | string | 否 | 平台分类筛选 |
| category_id | int | 否 | 分类 ID 筛选 |

### 响应

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "total": 50,
    "page": 1,
    "page_size": 10,
    "list": [
      {
        "id": 1,
        "name": "代码风格指南",
        "description": "统一的命名规范、缩进风格、注释标准...",
        "platform_category": null,
        "category_id": 1,
        "dir_id": null,
        "author_id": 1,
        "org_id": null,
        "zip_url": null,
        "reject_reason": null,
        "download_count": 15200,
        "latest_version": "v3.2",
        "status": "published",
        "color": null,
        "created_at": "2026-01-01 00:00:00",
        "updated_at": "2026-01-15 00:00:00"
      }
    ]
  }
}
```

### 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| total | int | 总记录数 |
| page | int | 当前页码 |
| page_size | int | 每页条数 |
| list | array | 规范列表 |

#### list 项字段

| 字段 | 类型 | 说明 |
|------|------|------|
| id | int | 规范 ID |
| name | string | 名称 |
| description | string | 描述 |
| platform_category | string | 平台分类（可能为 null） |
| category_id | int | 分类 ID |
| dir_id | int | 目录 ID（可能为 null） |
| author_id | int | 作者 ID |
| org_id | int | 组织 ID（可能为 null） |
| zip_url | string | 下载文件路径（可能为 null） |
| reject_reason | string | 驳回原因（可能为 null） |
| download_count | int | 下载次数 |
| latest_version | string | 最新版本号 |
| status | string | 状态（published=已发布） |
| color | string | 颜色值（可能为 null） |
| created_at | string | 创建时间 |
| updated_at | string | 更新时间 |

---

## 3. 规范详情

获取已发布规范的详细内容。

### 请求

- **方法**: GET
- **路径**: `/api/spec/public_spec_detail`
- **角色**: PUBLIC

### 参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | int | 是 | 规范 ID |

### 响应

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": 1,
    "name": "代码风格指南",
    "description": "统一的命名规范、缩进风格、注释标准...",
    "platform_category": null,
    "content_md": "---\nname: 代码风格指南\ndescription: ...\n---\n\n# 内容",
    "latest_version": "v3.2",
    "download_count": 15200
  }
}
```

### 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| id | int | 规范 ID |
| name | string | 名称 |
| description | string | 描述 |
| platform_category | string | 平台分类（可能为 null） |
| content_md | string | Markdown 内容 |
| latest_version | string | 最新版本号 |
| download_count | int | 下载次数 |

### 错误响应

```json
{
  "code": 404,
  "message": "规范不存在或未发布",
  "data": null
}
```

---

## 4. 规范下载

下载规范的 zip 文件。

### 请求

- **方法**: GET
- **路径**: `/api/spec/download_spec`
- **角色**: PUBLIC

### 参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | int | 是 | 规范 ID |

### 说明

- 使用 StreamingResponse 流式下载，支持大文件
- Content-Type: application/zip
- Content-Disposition: attachment; filename*=UTF-8''{filename}.zip
- 下载后自动递增 download_count

### 响应

二进制 zip 文件流。

### 错误响应

```json
{
  "code": 404,
  "message": "规范不存在",
  "data": null
}
```
