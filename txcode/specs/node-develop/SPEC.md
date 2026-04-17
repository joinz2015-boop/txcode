---
name: node-develop
description: Node.js后端项目开发规范，包括项目结构、路由规范、接口规范、命名规范。适用于添加新模块、代码审查、理解项目结构时使用。
read_mode: required
---

## 一、项目结构规范

```
src/
├── api/              # 接口层（接收请求、参数校验、调用 service）
│   └── {module}.routes.ts
├── service/          # 业务层（实现业务逻辑）
│   └── {module}Service.ts
├── repository/       # 数据层（操作数据库）
│   └── {module}Repository.ts
└── index.ts         # 路由汇总
```

**分层职责**：
- **api**：接收请求、参数校验、调用 service、返回响应
- **service**：实现业务逻辑、事务控制
- **repository**：数据库 CRUD 操作

## 二、分层架构

```
api/routes    → 接口层（接收请求、参数校验）
    ↓
service/      → 业务层（业务逻辑）
    ↓
repository/  → 数据层（数据库操作）
```

## 三、路由规范（核心）

### 3.1 HTTP 方法规范

| 方法 | 用途 | 参数传递方式 |
|------|------|-------------|
| **GET** | 查询（列表、详情） | URL query 参数 |
| **POST** | 增删改 所有写操作 | 请求体 body |

**严禁**：禁止在 URL 地址上传递参数用于 POST 请求

### 3.2 路由风格

```typescript
// ✅ 正确：GET 查询，POST 写操作
GET  /api/users              → 获取用户列表
GET  /api/users/detail       → 获取用户详情（参数在 query 中）
POST /api/users              → 创建用户
POST /api/users/update       → 更新用户（参数在 body 中）
POST /api/users/delete       → 删除用户（参数在 body 中）

// ❌ 错误：禁止 PUT/DELETE，禁止 URL 路径传参
PUT  /api/users/:id          → 禁止
GET  /api/users/:id          → 禁止 URL 路径传参
DELETE /api/users/:id        → 禁止
```

## 四、接口层规范（api）

### 4.1 路由定义示例

```typescript
/**
 * 用户 API 路由模块
 * 
 * 路由列表：
 * - GET    /api/users              -> 获取列表
 * - GET    /api/users/detail      -> 获取详情
 * - POST   /api/users              -> 创建
 * - POST   /api/users/update       -> 更新
 * - POST   /api/users/delete       -> 删除
 */

import { Router, Request, Response } from 'express';
import { UserService } from '../service/userService';

export const userRouter = Router();
const userService = new UserService();

userRouter.get('/', userController.getList);
userRouter.get('/detail', userController.getById);
userRouter.post('/', userController.create);
userRouter.post('/update', userController.update);
userRouter.post('/delete', userController.delete);
```

### 4.2 控制器示例

```typescript
class UserController {
  getList = (req: Request, res: Response) => {
    const { page, pageSize, name } = req.query;
    const result = userService.getList({ page, pageSize, name });
    res.json({ success: true, data: result });
  };

  getById = (req: Request, res: Response) => {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ success: false, error: 'id 必填' });
    }
    const result = userService.getById(id as string);
    if (!result) {
      return res.status(404).json({ success: false, error: '用户不存在' });
    }
    res.json({ success: true, data: result });
  };

  create = (req: Request, res: Response) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: '参数不完整' });
    }
    const result = userService.create({ name, email, password });
    res.status(201).json({ success: true, data: result });
  };

  update = (req: Request, res: Response) => {
    const { id, name, email } = req.body;
    if (!id) {
      return res.status(400).json({ success: false, error: 'id 必填' });
    }
    userService.update(id, { name, email });
    res.json({ success: true, message: '更新成功' });
  };

  delete = (req: Request, res: Response) => {
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({ success: false, error: 'id 必填' });
    }
    userService.delete(id);
    res.json({ success: true, message: '删除成功' });
  };
}

export const userController = new UserController();
```

## 五、业务层规范（service）

### 5.1 服务层示例

```typescript
import { UserRepository } from '../repository/userRepository';

export class UserService {
  private userRepo = new UserRepository();

  getList(params: { page?: number; pageSize?: number; name?: string }) {
    const { page = 1, pageSize = 10, name } = params;
    const offset = (page - 1) * pageSize;
    return this.userRepo.findAll({ pageSize, offset, name });
  }

  getById(id: string) {
    return this.userRepo.findById(id);
  }

  create(data: { name: string; email: string; password: string }) {
    return this.userRepo.insert(data);
  }

  update(id: string, data: { name?: string; email?: string }) {
    const existing = this.userRepo.findById(id);
    if (!existing) {
      throw new Error('用户不存在');
    }
    return this.userRepo.update(id, data);
  }

  delete(id: string) {
    const existing = this.userRepo.findById(id);
    if (!existing) {
      throw new Error('用户不存在');
    }
    return this.userRepo.delete(id);
  }
}
```

## 六、数据层规范（repository）

### 6.1 Repository 层示例

```typescript
import { dbService } from '../modules/db';

export class UserRepository {
  findAll(params: { pageSize: number; offset: number; name?: string }) {
    const { pageSize, offset, name } = params;
    if (name) {
      return dbService.all(
        'SELECT * FROM users WHERE name LIKE ? LIMIT ? OFFSET ?',
        [`%${name}%`, pageSize, offset]
      );
    }
    return dbService.all('SELECT * FROM users LIMIT ? OFFSET ?', [pageSize, offset]);
  }

  findById(id: string) {
    return dbService.get('SELECT * FROM users WHERE id = ?', [id]);
  }

  insert(data: { name: string; email: string; password: string }) {
    const id = crypto.randomUUID();
    dbService.run(
      'INSERT INTO users (id, name, email, password) VALUES (?, ?, ?, ?)',
      [id, data.name, data.email, data.password]
    );
    return this.findById(id);
  }

  update(id: string, data: { name?: string; email?: string }) {
    const sets: string[] = [];
    const values: any[] = [];
    if (data.name) {
      sets.push('name = ?');
      values.push(data.name);
    }
    if (data.email) {
      sets.push('email = ?');
      values.push(data.email);
    }
    if (sets.length > 0) {
      values.push(id);
      dbService.run(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, values);
    }
  }

  delete(id: string) {
    dbService.run('DELETE FROM users WHERE id = ?', [id]);
  }
}
```

## 七、命名规范

| 类型 | 命名格式 | 示例 |
|------|----------|------|
| 路由文件 | `kebab-case` | `user.routes.ts` |
| 控制器类 | `{Module}Controller` | `UserController` |
| 服务类 | `{Module}Service` | `UserService` |
| 数据类 | `{Module}Repository` | `UserRepository` |
| 方法 | camelCase | `getList`, `create`, `update` |

## 八、响应格式规范

```typescript
// 成功
{ success: true, data: {...} }

// 失败
{ success: false, error: '错误信息' }
```

### 状态码使用

| 状态码 | 用途 |
|--------|------|
| 200 | 成功 |
| 201 | 创建成功 |
| 400 | 参数错误 |
| 404 | 资源不存在 |
| 500 | 服务器错误 |
