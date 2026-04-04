---
name: testing
description: 项目测试规范与指南。包含后端测试（pytest、单元测试、集成测试、Mock使用、conftest配置）和前端测试（Vitest、组件测试、API测试、E2E测试）两部分的目录结构、命名规范、示例代码和测试命令。适用于编写测试用例、修改测试、解决测试问题时使用。
license: MIT
compatibility: txcode
metadata:
  audience: developers
  workflow: full-stack
---

## 一、职责范围

### 我的职责
- 指导后端单元测试和集成测试的编写
- 指导前端组件测试和页面测试的编写
- 规范测试文件组织结构
- 确保测试覆盖关键业务逻辑

### 使用场景
在以下情况下使用我：
- 编写新的测试用例
- 修改现有测试
- 理解测试规范
- 解决测试相关问题

---

## 二、后端测试

### 2.1 测试目录结构

```
tests/
├── __init__.py
├── conftest.py                          # pytest配置和fixture
├── unit/                                # 单元测试
│   ├── __init__.py
│   ├── test_services/
│   │   ├── __init__.py
│   │   └── test_user_service.py
│   └── test_repositories/
│       ├── __init__.py
│       └── test_user_repository.py
└── integration/                         # 集成测试
    ├── __init__.py
    └── test_user_api.py
```

### 2.2 测试文件命名规范

| 类型 | 命名格式 | 示例 |
|------|----------|------|
| 单元测试 | `test_*_service.py` | `test_user_service.py` |
| 仓库测试 | `test_*_repository.py` | `test_user_repository.py` |
| 集成测试 | `test_*_api.py` | `test_user_api.py` |

### 2.3 单元测试示例

```python
# tests/unit/test_services/test_user_service.py
import pytest
from app.services.user.user_service import UserService
from app.repositories.user.user_repository import UserRepository
from unittest.mock import Mock

class TestUserService:
    
    @pytest.fixture
    def user_repository(self):
        return Mock(spec=UserRepository)
    
    @pytest.fixture
    def user_service(self, user_repository):
        return UserService(user_repository)
    
    def test_get_user_by_id(self, user_service, user_repository):
        user_repository.get_by_id.return_value = {
            'id': 1,
            'name': '张三',
            'email': 'zhangsan@example.com'
        }
        
        result = user_service.get_user_by_id(1)
        
        assert result['id'] == 1
        assert result['name'] == '张三'
        user_repository.get_by_id.assert_called_once_with(1)
    
    def test_create_user(self, user_service, user_repository):
        user_data = {'name': '李四', 'email': 'lisi@example.com'}
        user_repository.create.return_value = {'id': 2, **user_data}
        
        result = user_service.create_user(user_data)
        
        assert result['id'] == 2
        assert result['name'] == '李四'
        user_repository.create.assert_called_once()
```

### 2.4 集成测试示例

```python
# tests/integration/test_user_api.py
import pytest
from app import create_app

@pytest.fixture
def client():
    app = create_app('testing')
    with app.test_client() as client:
        yield client

class TestUserAPI:
    
    def test_list_users(self, client):
        response = client.get('/api/users/list?page=1&size=10')
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['code'] == 200
        assert 'data' in data
    
    def test_create_user(self, client):
        response = client.post('/api/users/save_user', 
                               json={'name': '王五', 'email': 'wangwu@example.com'})
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['code'] == 200
    
    def test_delete_user(self, client):
        response = client.post('/api/users/delete_user',
                               json={'id': 1})
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['code'] == 200
```

### 2.5 测试规范

- 每个服务方法至少有一个对应的测试用例
- 测试方法命名：`test_{方法名}_{场景}`
- 使用 Mock 隔离外部依赖
- 保持测试独立，避免相互依赖
- 集成测试使用测试数据库

---

## 三、前端测试

### 3.1 测试目录结构

```
src/
├── tests/                               # 测试目录
│   ├── unit/                            # 单元测试
│   │   ├── components/                  # 组件测试
│   │   │   ├── AddUser.spec.js
│   │   │   └── EditUser.spec.js
│   │   └── utils/                       # 工具函数测试
│   │       └── format.spec.js
│   └── e2e/                             # 端到端测试
│       └── user.spec.js
```

### 3.2 测试文件命名规范

| 类型 | 命名格式 | 示例 |
|------|----------|------|
| 组件测试 | `*.spec.js` 或 `*.test.js` | `AddUser.spec.js` |
| 工具函数测试 | `*.spec.js` | `format.spec.js` |
| E2E测试 | `*.spec.js` | `user.spec.js` |

### 3.3 组件测试示例（Vitest）

```javascript
// src/tests/unit/components/AddUser.spec.js
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import AddUser from '@/components/user/AddUser.vue'
import { userApi } from '@/api/userApi'

vi.mock('@/api/userApi', () => ({
  userApi: {
    save: vi.fn()
  }
}))

describe('AddUser', () => {
  it('should emit success event after saving', async () => {
    userApi.save.mockResolvedValue({ code: 200 })
    
    const wrapper = mount(AddUser, {
      props: { visible: true }
    })
    
    await wrapper.vm.handleSave({ name: '张三' })
    
    expect(wrapper.emitted('success')).toBeTruthy()
  })
  
  it('should validate required fields', async () => {
    const wrapper = mount(AddUser, {
      props: { visible: true }
    })
    
    await wrapper.vm.handleSave({})
    
    expect(wrapper.vm.errors.name).toBe('请输入用户名')
  })
})
```

### 3.4 API测试示例

```javascript
// src/tests/unit/api/userApi.spec.js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import axios from 'axios'
import { list, save, remove } from '@/api/userApi'

vi.mock('axios')

describe('userApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })
  
  describe('list', () => {
    it('should fetch user list with pagination', async () => {
      const mockData = { data: [{ id: 1, name: '张三' }] }
      axios.get.mockResolvedValue(mockData)
      
      const result = await list({ page: 1, size: 10 })
      
      expect(axios.get).toHaveBeenCalledWith('/api/users/list', {
        params: { page: 1, size: 10 }
      })
      expect(result).toEqual(mockData)
    })
  })
  
  describe('save', () => {
    it('should save user with POST method', async () => {
      const mockData = { code: 200, data: { id: 1 } }
      axios.post.mockResolvedValue(mockData)
      
      const result = await save({ name: '张三' })
      
      expect(axios.post).toHaveBeenCalledWith('/api/users/save_user', {
        name: '张三'
      })
      expect(result).toEqual(mockData)
    })
  })
  
  describe('remove', () => {
    it('should delete user by id', async () => {
      const mockData = { code: 200 }
      axios.post.mockResolvedValue(mockData)
      
      const result = await remove({ id: 1 })
      
      expect(axios.post).toHaveBeenCalledWith('/api/users/delete_user', {
        id: 1
      })
    })
  })
})
```

### 3.5 测试规范

- 组件测试覆盖 Props、Emit、用户交互
- API测试覆盖正常响应和错误处理
- 使用 Mock 隔离 API 调用
- E2E测试覆盖关键业务流程
- 保持测试快速执行

---

## 四、测试命令

### 4.1 后端测试命令

```bash
# 运行所有测试
pytest

# 运行单元测试
pytest tests/unit/

# 运行集成测试
pytest tests/integration/

# 运行指定文件
pytest tests/unit/test_services/test_user_service.py

# 生成覆盖率报告
pytest --cov=app --cov-report=html
```

### 4.2 前端测试命令

```bash
# 运行所有测试
npm test

# 运行单元测试
npm run test:unit

# 运行E2E测试
npm run test:e2e

# 监听模式
npm run test:unit -- --watch

# 生成覆盖率报告
npm run test:unit -- --coverage
```
