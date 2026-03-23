# File Operations Skill

优化文件操作任务，确保正确使用 write_file 和 edit_file 工具。

## 触发条件

当用户要求创建、修改文件或写入内容时自动加载。

## 核心规则

### 1. 文件操作优先原则

- **创建新文件** → 直接调用 `write_file`，不要过度探索
- **修改现有文件** → 先读取确认内容，再调用 `edit_file`
- **大内容写入** → 使用占位符格式 `$content:N`

### 2. 迭代次数管理

任务应在 **5 步内**完成文件操作：

```
Step 1: 确认目标文件路径
Step 2: 检查文件是否存在（如需要）
Step 3: 直接执行 write_file 或 edit_file
Step 4: 验证结果（可选）
Step 5: 返回完成
```

### 3. 内容格式规范

**小内容（<100字符）**：直接写入
```json
{
  "action": "write_file",
  "action_input": {
    "file_path": "path/to/file.md",
    "content": "# Hello\n\nThis is content."
  }
}
```

**大内容（>=100字符）**：使用占位符
```json
{
  "action": "write_file",
  "action_input": {
    "file_path": "path/to/file.ts",
    "content": "$content:1"
  }
}
---
$content:1
// 实际代码内容
export function hello() {
  console.log("Hello World");
}
```

### 4. 常见错误避免

| 错误 | 正确做法 |
|------|----------|
| 反复探索不执行 | 确认路径后立即执行 |
| 内容过长导致截断 | 使用占位符格式 |
| 忘记检查文件存在 | write_file 前确认是新建 |
| edit_file 找不到内容 | 先 read_file 确认精确内容 |

## 工具使用

- `write_file`: 创建新文件
- `edit_file`: 修改现有文件
- `read_file`: 读取文件内容

## 示例

### 示例 1：创建新文件

用户：在 src/utils/ 下创建 helpers.ts 文件

正确流程：
```json
// Step 1 - 检查目录
{"action": "execute_bash", "action_input": {"command": "ls src/utils/ 2>/dev/null || mkdir -p src/utils"}}

// Step 2 - 创建文件
{"action": "write_file", "action_input": {"file_path": "src/utils/helpers.ts", "content": "// Helper functions\n\nexport function noop() {}"}}
```

### 示例 2：写入大内容

用户：把差异分析写入 diff.md

正确流程：
```json
// 直接写入，不要过度分析
{"action": "write_file", "action_input": {"file_path": "diff.md", "content": "$content:1"}}
---
$content:1
# 差异分析
...大量内容...
```

### 示例 3：修改现有文件

用户：修改 config.ts 中的端口为 4000

正确流程：
```json
// Step 1 - 读取确认
{"action": "read_file", "action_input": {"file_path": "config.ts"}}

// Step 2 - 精确替换
{"action": "edit_file", "action_input": {"file_path": "config.ts", "old_string": "port: 3000", "new_string": "port: 4000"}}
```

## 注意事项

1. **不要猜测文件内容** - 先读取再修改
2. **不要重复检查** - 确认一次即可执行
3. **不要过度解释** - 执行完成后简洁汇报
4. **优先完成任务** - 减少不必要的探索步骤
