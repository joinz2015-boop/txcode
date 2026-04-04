---
name: 路由配置示例
description: Vue Router路由配置示例
---

```js
import { createRouter, createWebHistory } from 'vue-router'
import Layout from '@/views/layout/index.vue'

const routes = [
  {
    path: '/',
    component: Layout,
    redirect: '/dashboard',
    children: [
      {
        path: '/views/index/dashboard',
        name: 'Dashboard',
        component: () => import('../views/index/dashboard.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: '/views/user/listUser',
        name: 'UserList',
        component: () => import('../views/user/listUser.vue'),
        meta: { requiresAuth: true }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
```
