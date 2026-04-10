# 如何生成 menu.yaml

## 一、概述

menu.yaml 是知识库的索引目录，采用 YAML 格式，支持三级树形结构。

---

## 二、大类划分

### 2.1 判断依据

扫描项目根目录和主要子目录，检测项目类型：

| 大类 | 检测条件 |
|------|----------|
| frontend | 存在 vue/ts/tsx/jsx/html/android/ios/flutter 等前端特征 |
| backend | 存在 controllers/services/repositories/api/routes 等后端特征 |

### 2.2 扫描命令

```bash
# 前端特征
glob **/*.{vue,tsx,jsx}
glob **/pages/**
glob **/activity_*.xml
glob **/App.vue
glob index.html
glob build.gradle
glob Podfile

# 后端特征
glob **/controllers/**
glob **/services/**
glob **/repositories/**
glob **/api/**
glob **/routes/**
```

---

## 三、模块划分

### 3.1 前端模块

按页面文件的目录归类：

```
src/views/user/listUser.vue  → 用户管理
src/views/user/userDetail.vue → 用户管理
src/views/order/orderList.vue → 订单管理
```

**规则**：
- 目录名作为模块名
- 相同目录的页面归为同一模块
- 无目录的页面按文件名关键词归类

### 3.2 后端模块

按控制器/路由文件归类：

```
controllers/user_controller.py  → 用户接口
controllers/order_controller.py → 订单接口
routes/user.py → 用户接口
```

**规则**：
- 控制器文件名按 `_controller` 前缀归类
- 路由文件按路径前缀归类
- 模块名使用中文翻译

---

## 四、生成格式

```yaml
site_name: 项目知识库
generated: 2026-01-15 10:30:00
git_commit: abc1234
nav:
  - title: 前端页面
    icon: fa-solid fa-desktop
    children:
      - title: 用户管理
        children:
          - title: 用户列表
            url: frontend/用户管理/用户列表.md
          - title: 用户详情
            url: frontend/用户管理/用户详情.md
      - title: 订单管理
        children:
          - title: 订单列表
            url: frontend/订单管理/订单列表.md
  - title: 后端接口
    icon: fa-solid fa-server
    children:
      - title: 用户接口
        children:
          - title: list_user
            url: backend/用户接口/list_user.md
          - title: save_user
            url: backend/用户接口/save_user.md
      - title: 订单接口
        children:
          - title: create_order
            url: backend/订单接口/create_order.md
```

---

## 五、字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| site_name | string | 站点名称 |
| generated | string | 生成时间 |
| git_commit | string | Git Commit ID |
| nav | array | 导航菜单 |
| nav[].title | string | 菜单标题 |
| nav[].icon | string | FontAwesome 图标 |
| nav[].url | string | 链接地址（二级菜单为叶子节点时） |
| nav[].children | array | 子菜单（三级菜单） |

---

## 六、注意事项

1. **中文命名**：模块名和页面名使用中文
2. **图标选择**：
   - 前端页面：`fa-solid fa-desktop`, `fa-solid fa-mobile`, `fa-solid fa-tablet`
   - 后端接口：`fa-solid fa-server`, `fa-solid fa-database`, `fa-solid fa-api`
   - 模块级：`fa-solid fa-folder`, `fa-solid fa-sitemap`
3. **相对路径**：url 使用相对于 `.txcode/wiki/` 的路径
4. **叶子节点**：最末级菜单必须有 url，非叶子节点有 children
5. **验证必须**：生成 menu.yaml 后必须运行 `validate-menu.cjs` 验证
