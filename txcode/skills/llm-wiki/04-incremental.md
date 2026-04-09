# 增量更新逻辑

## 一、核心思路

以 Git Commit ID 为基准，只分析变更的文件，避免重复分析。

---

## 二、更新流程

### 2.1 首次生成

```
1. git rev-parse HEAD 获取最新 commit id
2. git log -1 --format="%ci" 获取提交时间
3. 创建 .txcode/wiki/ 目录
4. 扫描所有入口文件
5. 分析每个文件生成 md
6. 生成 menu.yaml
```

### 2.2 增量更新

```
1. git rev-parse HEAD 获取当前 commit id
2. git log -1 --format="%ci" 获取当前提交时间
3. 读取 .txcode/wiki/menu.yaml 获取上次 commit id
4. git diff --name-only <上次commit> <当前commit> 获取变更文件
5. 过滤入口文件（跳过实体、配置等）
6. 对变更文件重新分析
7. 检查是否有删除的文件，清理对应的 md
8. 重新生成 menu.yaml（包含最新 git 信息）
```

---

## 三、Git 命令

### 3.1 获取当前状态

```bash
# 获取最新 commit id（短）
git rev-parse --short HEAD

# 获取最新 commit id（完整）
git rev-parse HEAD

# 获取提交时间
git log -1 --format="%ci"

# 获取提交时间（格式化）
git log -1 --format="%Y-%m-%d %H:%M:%S"
```

### 3.2 获取变更文件

```bash
# 获取所有变更文件
git diff --name-only <上次commit> HEAD

# 获取新增文件
git diff --name-only --diff-filter=A <上次commit> HEAD

# 获取修改文件
git diff --name-only --diff-filter=M <上次commit> HEAD

# 获取删除文件
git diff --name-only --diff-filter=D <上次commit> HEAD
```

---

## 四、变更处理

### 4.1 新增文件
- 创建新的 md 文件
- 重新生成 menu.yaml

### 4.2 修改文件
- 重新分析，更新 md 文件
- 重新生成 menu.yaml

### 4.3 删除文件
- 删除对应的 md 文件
- 重新生成 menu.yaml

---

## 五、注意事项

1. **读取 menu.yaml**：从 menu.yaml 的 `git_commit` 字段获取上次分析的 commit id
2. **删除处理**：检测到删除时及时清理对应的 md 文件
3. **批量操作**：变更文件多时分组处理
4. **Git 信息**：每次生成 menu.yaml 时更新 `git_commit` 和 `generated` 字段
