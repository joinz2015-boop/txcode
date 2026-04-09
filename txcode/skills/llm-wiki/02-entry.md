# 如何找入口文件

## 一、入口文件定义

| 类型 | 入口文件 | 说明 |
|------|----------|------|
| 前端 | 页面文件 | .vue, .tsx, .jsx, .html, activity_*.xml |
| 后端 | 控制器/路由 | *_controller.py, *.go, routes/*.js |

---

## 二、前端入口文件

### 2.1 扫描规则

按优先级扫描：

1. **Vue/React 页面**
```bash
glob src/views/**/*.vue
glob src/pages/**/*.vue
glob src/pages/**/*.tsx
glob src/pages/**/*.jsx
```

2. **HTML 页面**
```bash
glob **/*.html
```

3. **Android 页面**
```bash
glob **/activity_*.xml
```

4. **iOS 页面**
```bash
glob **/*.swift
```

### 2.2 过滤规则

**跳过**：
- 组件文件（components/ 下的非页面文件）
- 布局文件（layouts/）
- 公共组件（common/）
- 配置/工具文件

**保留**：
- views/pages 下的路由页面
- 带路由注解的页面
- 顶级目录下的 html 文件

### 2.3 判断页面

满足以下任一条件即为页面：
- 文件名含 `list`, `detail`, `add`, `edit`, `create`, `view`, `index`
- 位于 views/pages 等页面目录
- 包含路由配置

---

## 三、后端入口文件

### 3.1 Python 项目

```bash
glob **/*_controller.py
glob **/controllers/**/*.py
```

### 3.2 Java 项目

```bash
glob **/*Controller.java
glob **/controller/**/*.java
```

### 3.3 Go 项目

```bash
glob **/*handler.go
glob **/handlers/**/*.go
```

### 3.4 Node.js 项目

```bash
glob **/routes/**/*.js
glob **/controllers/**/*.js
```

### 3.5 过滤规则

**跳过**：
- 中间件文件
- 工具类
- 配置类
- 测试文件
- 实体/模型类（*.model.*, *Entity*, *Entity.*）

**保留**：
- 带路由注解的类
- 包含 HTTP 方法的类
- 路由定义文件

---

## 四、模块归类

### 4.1 归类规则

根据文件路径或命名推断模块：

```python
# 前端
src/views/user/listUser.vue → 用户管理
src/views/order/createOrder.vue → 订单管理

# 后端
user_controller.py → 用户接口
order_controller.py → 订单接口
```

### 4.2 模块名映射

常用模块名对照：

| 英文 | 中文 |
|------|------|
| user | 用户管理 |
| order | 订单管理 |
| product | 商品管理 |
| system | 系统管理 |
| admin | 后台管理 |
| api | 接口 |

---

## 五、示例

### 前端入口文件列表

```
src/views/user/listUser.vue      → 用户管理 / 用户列表
src/views/user/userDetail.vue   → 用户管理 / 用户详情
src/views/user/addUser.vue      → 用户管理 / 新增用户
src/views/order/orderList.vue    → 订单管理 / 订单列表
src/views/order/orderDetail.vue  → 订单管理 / 订单详情
```

### 后端入口文件列表

```
controllers/user_controller.py  → 用户接口 / list_user, save_user
controllers/order_controller.py → 订单接口 / create_order, list_order
controllers/product_controller.py → 商品接口 / list_product
```
