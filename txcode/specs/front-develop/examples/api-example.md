---
name: API请求示例
description: 前端API请求封装示例
---

```js
import request from '@/utils/request'

export function listUser(params) {
  return request({
    url: '/user/list',
    method: 'get',
    params
  })
}

export function saveUser(data) {
  return request({
    url: '/user/save',
    method: 'post',
    data
  })
}

export function deleteUser(data) {
  return request({
    url: '/user/delete',
    method: 'post',
    data
  })
}
```
