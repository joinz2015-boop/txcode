---
name: 前端vue项目开发规范
description: 开发前端项目时必须要遵循的开发规范，包括项目结构、命名、API请求、路由、组件规范。适用于添加新模块、代码审查、理解项目结构时使用。
read_mode: required
---

## 一、项目结构规范
```
src/
├── api/              # API 接口定义（按模块划分）
├── assets/           # 静态资源
├── components/       # 组件
│   ├── common/       # 通用基础组件
│   └── business/     # 业务组件
├── layouts/          # 布局组件
├── router/           # 路由配置
├── styles/           # 全局样式
├── utils/            # 工具函数
├── views/            # 页面
└── App.vue
```

**重要**：开发一个页面包括：
1. 页面（必须）：`src/views/{module}/{page}.vue`
2. 组件（可选）：`src/components/{module}/`
3. API文件：`src/api/{module}/`

## 二、分层架构

```
views/      → 页面层（路由页面）
    ↓
components/ → 组件层（业务组件/公共组件）
    ↓
api/        → API调用层
    ↓
utils/      → 工具层
```

## 三、命名规范

| 类型 | 命名格式 | 示例 |
|------|----------|------|
| 页面 | `{动作}{Module}.vue` | `listUser.vue`, `addUser.vue`, `editUser.vue`, `deleteUser.vue`, `userDetail.vue` |
| 业务组件 | `{动作}{Module}.vue` | `addUser.vue` |
| 公共组件 | `camelCase` | `baseButton.vue` |
| API | `camelCase` | `userApi.js` |

**禁止**：`list.vue`, `index.vue` 等无意义命名

## 四、API 请求规范

参考示例：`examples/api-example.md`

## 五、路由规范

参考示例：`examples/router-example.md`

## 六、页面开发规范

### 6.1 List页面

参考示例：`examples/list-page-example.md`

### 6.2 添加/修改/删除组件

参考示例：`examples/dialog-example.md`

### 6.3 组件通讯

组件间通过 `ref` 调用子组件方法：
```js
const addUserRef = ref(null)
addUserRef.value?.open(data)
```

## 七、目录结构示例

```
src/
├── api/user/
│   └── userApi.js
├── components/user/
│   ├── AddUser.vue
│   ├── EditUser.vue
│   └── DelUser.vue
└── views/user/
    └── listUser.vue
```
