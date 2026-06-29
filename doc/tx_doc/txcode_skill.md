# TxCode Hub — Skill 公共接口文档

Skill 模块的公开接口（PUBLIC，无需登录）。

---

## 1. Skill 分类列表

获取所有 Skill 分类列表。

### 请求

- **方法**: GET
- **路径**: `/api/skill_category/list_skill_category`
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
      "name": "前端开发",
      "color": "blue",
      "description": null,
      "sort_order": 1,
      "status": 1,
      "is_system": 1,
      "created_at": "2026-06-27 18:50:24",
      "updated_at": "2026-06-27 18:50:24"
    },
    {
      "id": 2,
      "name": "后端开发",
      "color": "purple",
      "description": null,
      "sort_order": 2,
      "status": 1,
      "is_system": 1,
      "created_at": "2026-06-27 18:50:24",
      "updated_at": "2026-06-27 18:50:24"
    }
  ]
}
```

### 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| id | int | 分类 ID |
| name | string | 分类名称 |
| color | string | 颜色标识 |
| description | string | 分类描述（可能为 null） |
| sort_order | int | 排序序号 |
| status | int | 状态（1=启用） |
| is_system | int | 是否系统内置（1=是，0=否） |

---

## 2. Skill 公共列表

获取已发布的 Skill 列表，支持分页、搜索和分类筛选。

### 请求

- **方法**: GET
- **路径**: `/api/skill/list_published_skill`
- **角色**: PUBLIC

### 参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | int | 否 | 页码，默认 1 |
| page_size | int | 否 | 每页条数，默认 10 |
| keyword | string | 否 | 搜索关键字（模糊匹配名称和描述） |
| category_id | int | 否 | 分类 ID 筛选 |

### 响应

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "total": 50,
    "page": 1,
    "page_size": 20,
    "list": [
      {
        "id": 1,
        "name": "React 组件生成器",
        "description": "快速生成 React 组件代码",
        "category_id": 1,
        "tags": "react,typescript",
        "download_count": 2341,
        "latest_version": "v2.1.0",
        "icon_url": null
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
| list | array | Skill 列表 |

#### list 项字段

| 字段 | 类型 | 说明 |
|------|------|------|
| id | int | Skill ID |
| name | string | 名称 |
| description | string | 描述 |
| category_id | int | 分类 ID |
| tags | string | 标签（逗号分隔） |
| download_count | int | 下载次数 |
| latest_version | string | 最新版本号 |
| icon_url | string | 图标 URL（可能为 null） |

---

## 3. Skill 下载

下载 Skill 的 zip 文件。

### 请求

- **方法**: GET
- **路径**: `/api/skill/download_skill`
- **角色**: PUBLIC

### 参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | int | 是 | Skill ID |

### 说明

- 使用 StreamingResponse 流式下载，支持大文件
- Content-Type: application/zip
- Content-Disposition: attachment; filename="{dir_name}.zip"
- 下载后自动递增 download_count

### 响应

二进制 zip 文件流。

### 错误响应

```json
{
  "code": 404,
  "message": "Skill 不存在或文件不存在",
  "data": null
}
```
