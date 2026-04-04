---
name: 接口文档示例
description: 接口文档编写示例
---

## 基本信息

| 字段 | 值 |
|------|-----|
| 请求方法 | GET |
| 请求路径 | /api/users/list_user |
| 认证方式 | Bearer Token |

## 请求参数

### Query 参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| page | int | 否 | 页码，默认1 |
| size | int | 否 | 每页条数，默认10 |

## 响应参数

| 字段名 | 类型 | 说明 |
|--------|------|------|
| code | int | 状态码，200成功 |
| message | string | 提示信息 |
| data | object | 返回数据 |
| data.list | array | 数据列表 |
| data.total | int | 总条数 |

## 请求示例

```
GET /api/users/list_user?page=1&size=10
```

## 响应示例

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "list": [
      {
        "id": 1,
        "name": "张三"
      }
    ],
    "total": 100
  }
}
```

## 错误码

| 错误码 | 说明 |
|--------|------|
| 400 | 参数错误 |
| 401 | 未授权 |
| 500 | 服务器错误 |
