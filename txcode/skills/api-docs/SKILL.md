---
name: api-docs
description: API接口文档编写规范与指南。包含接口文档模板、字段规范、响应格式示例、markdown表格格式说明。适用于编写接口文档、审查API规范、生成Swagger/OpenAPI文档时使用。
license: MIT
compatibility: txcode
metadata:
  audience: developers
  workflow: full-stack
---

## 一、职责范围

### 我的职责
- 规范接口文档的编写格式
- 确保文档包含完整的请求/响应示例
- 指导字段说明的规范化描述

### 使用场景
在以下情况下使用我：
- 开发新接口时编写文档
- 更新现有接口文档
- 审查接口文档的完整性
- 生成API文档

---

## 二、接口文档模板

每个接口文档使用独立的 `.md` 文件，存放在 `docs/接口文档/{模块}/` 目录下：

```
docs/接口文档/
├── user/
│   ├── 用户列表_api_users_list.md
│   ├── 用户详情_api_users_detail.md
│   ├── 保存用户_api_users_save_user.md
│   └── 删除用户_api_users_delete_user.md
└── order/
    └── ...
```

**命名格式：** `接口名称_接口路径.md`，使用下划线连接，便于通过接口路径快速定位文档。

### 2.1 文档模板

**文档存放路径：** `docs/接口文档/{模块}/接口名称_{接口路径}.md`

例如：`docs/接口文档/user/用户列表_api_users_list.md`

```markdown
# 接口名称

## 基本信息

| 属性 | 值 |
|------|-----|
| 接口路径 | /api/users/list |
| 请求方式 | GET |
| 功能描述 | 获取用户列表 |

## 请求参数

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | int | 否 | 页码，默认1 |
| size | int | 否 | 每页条数，默认10 |

## 请求示例

```
GET /api/users/list?page=1&size=10
```

## 响应参数

| 字段 | 类型 | 说明 |
|------|------|------|
| code | int | 状态码，200表示成功 |
| message | string | 提示信息 |
| data | array | 数据列表 |
| data[].id | int | 用户ID |
| data[].name | string | 用户名称 |
| data[].email | string | 用户邮箱 |
| timestamp | long | 时间戳 |

## 响应示例

```json
{
  "code": 200,
  "message": "success",
  "data": [
    {
      "id": 1,
      "name": "张三",
      "email": "zhangsan@example.com"
    }
  ],
  "timestamp": 1704067200000
}
```

## 错误码

| code | 说明 |
|------|------|
| 400 | 参数错误 |
| 401 | 未授权 |
| 500 | 服务器错误 |
```

---

## 三、POST接口文档模板

```markdown
# 接口名称

## 基本信息

| 属性 | 值 |
|------|-----|
| 接口路径 | /api/users/save_user |
| 请求方式 | POST |
| Content-Type | application/json |
| 功能描述 | 创建/更新用户 |

## 请求参数

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | int | 否 | 用户ID，传入表示更新，不传表示创建 |
| name | string | 是 | 用户名称 |
| email | string | 是 | 用户邮箱 |
| phone | string | 否 | 手机号 |

## 请求示例

```json
{
  "name": "张三",
  "email": "zhangsan@example.com",
  "phone": "13800138000"
}
```

## 响应参数

| 字段 | 类型 | 说明 |
|------|------|------|
| code | int | 状态码 |
| message | string | 提示信息 |
| data | object | 返回数据 |
| data.id | int | 用户ID |
| timestamp | long | 时间戳 |

## 响应示例

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": 1
  },
  "timestamp": 1704067200000
}
```

## 错误码

| code | 说明 |
|------|------|
| 400 | 参数校验失败 |
| 401 | 未授权 |
| 500 | 服务器错误 |
```

---

## 四、字段类型说明

| 类型 | 说明 | 示例 |
|------|------|------|
| string | 字符串 | "张三" |
| int | 整数 | 1, 100 |
| long | 长整数（时间戳） | 1704067200000 |
| boolean | 布尔值 | true, false |
| array | 数组 | [] |
| object | 对象 | {} |
| float | 浮点数 | 1.5 |

---

## 五、编写规范

### 5.1 基本要求

- 每个接口必须有独立的 `.md` 文件
- 文件名与接口路径保持一致
- 中英文之间添加空格
- 使用中文标点符号
- 必填字段用"是"表示，可选字段用"否"表示

### 5.2 字段说明

- 字段说明使用简洁的中文描述
- 枚举值列出所有可能的取值
- 特殊格式说明（如日期格式、手机号格式）

### 5.3 示例数据

- 请求示例使用真实可用的测试数据
- 响应示例包含正常和异常情况
- 数据符合业务逻辑
