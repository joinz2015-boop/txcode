---
name: python-develop
description: python后端项目开发规范。包含后端分层架构（Controller→Service→Repository→Model）后端目录结构、文件命名规范、HTTP请求路径规范（GET查列表/详情，POST增删改用JSON body）。适用于添加新模块、代码审查、理解项目结构时使用。
read_mode: required
---

## 一、职责范围

### 我的职责
- 强制执行分层架构模式（Controller → Service → Repository → Model）
- 确保模块隔离和跨模块通信规则
- 验证命名规范和代码组织
- 指导模块结构

### 使用场景
在以下情况下使用我：
- 修改代码前需要了解项目架构
- 添加新的业务模块（后端或前端）
- 审查代码的架构合规性
- 解答关于层级职责的问题
- 按照项目规范设置新功能

## 二、架构

### 2.1 分层架构

```
请求流 → 中间件 → 控制层 → 服务层 → 仓库层 → 数据层
                     ↓         ↓         ↓
                 按模块划分  按模块划分  按模块划分
```
### 2.2 各层职责

| 层级 | 职责 | 禁止事项 |
|------|------|----------|
| 控制层 (controllers) | HTTP请求处理、参数校验、响应封装 | 禁止包含业务逻辑、禁止直接操作数据库 |
| 服务层 (services) | 业务逻辑实现、事务管理、缓存策略 | 禁止直接编写SQL语句、禁止直接操作HTTP响应 |
| 仓库层 (repositories) | 数据访问封装、ORM操作、复杂查询 | 禁止包含业务逻辑、禁止返回非实体对象 |
| 模型层 (models) | 数据表结构定义、关系映射 | 禁止包含业务逻辑 |

### 2.3 模块划分规范

每个业务模块独立维护自己的三层代码：

```
controllers/{module}/     # 控制层：HTTP路由处理
services/{module}/           # 服务层：业务逻辑
repositories/{module}/       # 仓库层：数据访问
models/{module}/             # 模型层：数据表结构
schemas/{module}/            # DTO层：数据校验
```

### 2.4 文件命名规范

| 类型 | 命名格式 | 示例 |
|------|----------|------|
| 控制器 | `*_controller.py` | `user_controller.py` |
| 服务 | `*_service.py` | `user_service.py` |
| 仓库 | `*_repository.py` | `user_repository.py` |
| 模型 | `*.py` | `user.py` |
| DTO | `*_schema.py` | `user_schema.py` |

### 2.5 命名规范

- 类名：大驼峰 `UserService`
- 方法名：小驼峰 `get_user_by_id`
- 变量名：小写+下划线 `user_id`

### 2.6 统一响应格式

```json
{
  "code": 200,
  "message": "success",
  "data": {},
  "timestamp": 1234567890
}
```

## 三、请求路径规范

### 3.1 HTTP 方法规范

| 操作 | HTTP方法 | 说明 |
|------|----------|------|
| 查询列表/详情 | GET | 查询参数通过 URL query string 传递 |
| 创建 | POST | 参数通过 JSON body 传递，禁止 URL 传参 |
| 更新 | POST | 参数通过 JSON body 传递，禁止 URL 传参 |
| 删除 | POST | 参数通过 JSON body 传递，禁止 URL 传参 |

### 3.2 后端路由格式

```
/api/{模块名}/list_{模块名}       # 查询列表
/api/{模块名}/{模块名}_detail     # 查询详情
/api/{模块名}/save_{模块名}  # 创建/更新
/api/{模块名}/delete_{模块名}  # 删除
```
**重要** 就三层 /api/{模块名}/{动作}_{模块名}，严禁出现/api/user/member/list 这种正确的做法应该是/api/user/list_user_member

**请求示例：**

```
GET  /api/users/list_user?page=1&size=10                    # 查询用户列表
GET  /api/users/user_detail?id=123                        # 查询用户详情
POST /api/users/save_user    {"name":"张三"}         # 创建用户
POST /api/users/save_user    {"id":123,"name":"李四"} # 更新用户
POST /api/users/delete_user  {"id":123}              # 删除用户
```

## 四、功能开发清单

### 4.1 开发清单

开发一个新功能（如用户模块）时需要创建/修改的文件：

```
后端/
├── models/user/user.py              # 1. 创建数据模型
├── schemas/user/user_schema.py       # 2. 创建DTO/请求验证
├── repositories/user/user_repository.py  # 3. 创建数据访问层
├── services/user/user_service.py     # 4. 创建业务逻辑层
├── controllers/user_controller.py     # 5. 创建路由控制器
└── main.py                           # 6. 注册路由
```

**重要：每个接口必须有对应的 `.md` 文档文件，存放在 `docs/接口文档/{模块}/` 目录下，文件名格式为 `接口名称_接口路径.md`。如何熟悉接口文档可以阅读api-docs skill**

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

详细规范见 `api-docs` skill。

## 五、模块间通信规则

### 5.1 后端规则

- 跨模块调用必须通过**服务层**
- 禁止控制层直接调用其他模块仓库层
- 禁止模型层跨模块引用
- 公共逻辑放在 `common/` 模块