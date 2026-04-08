---
name: skill-authoring
description: 编写和创建SKILL.md技能文件的规范与指南。包含文件结构、frontmatter格式、命名规则、内容模板。适用于创建新技能、审查技能规范、批量生成技能时使用。
license: MIT
compatibility: txcode
metadata:
  audience: developers
  workflow: txcode
---

## 一、职责范围

### 我的职责
- 规范 SKILL.md 技能文件的编写格式
- 确保技能文件包含完整的结构和必要信息
- 指导技能的目录结构、命名规范、内容组织

### 使用场景
在以下情况下使用我：
- 创建新的技能文件时
- 审查技能文件的完整性
- 批量生成技能文件
- 优化现有技能结构

---

## 二、文件放置规范

### 2.1 目录结构

每个技能放置在独立文件夹中，文件夹名与技能名一致：

```
.txcode/skills/
├── skill-authoring/
│   └── SKILL.md
├── api-docs/
│   └── SKILL.md
└── git-release/
    └── SKILL.md
```

### 2.2 放置路径

技能文件放在 `.txcode/skills/<name>/SKILL.md`，系统会自动扫描加载。

---

## 三、文件结构

### 3.1 必选结构

每个 SKILL.md 必须包含：

1. **YAML frontmatter** - 文件头部元数据
2. **正文内容** - 技能的具体说明和指南

### 3.2 Frontmatter 格式

```yaml
---
name: <skill-name>
description: <1-1024字符的描述>
license: MIT
compatibility: txcode
metadata:
  audience: developers
  workflow: txcode
---
```

#### Frontmatter 字段说明

| 字段 | 必填 | 说明 |
|------|------|------|
| name | 是 | 技能名称，1-64字符 |
| description | 是 | 技能描述，1-1024字符 |
| license | 否 | 许可证类型 |
| compatibility | 否 | 兼容性标识 |
| metadata | 否 | 元数据映射 |

---

## 四、命名规则

### 4.1 名称验证

`name` 必须满足：
- 长度为 1-64 个字符
- 仅包含小写字母和数字，可用单个连字符分隔
- 不以 `-` 开头或结尾
- 不包含连续的 `--`
- 与包含 SKILL.md 的目录名称一致

**正则表达式**：`^[a-z0-9]+(-[a-z0-9]+)*$`

### 4.2 命名示例

正确示例：
- `api-docs`
- `git-release`
- `code-review`
- `sql-helper`

错误示例：
- `Api-Docs` (包含大写)
- `api_docs` (使用下划线)
- `-invalid` (以连字符开头)
- `double--dash` (连续连字符)

---

## 五、正文内容规范

### 5.1 章节结构建议

```
## 一、职责范围

### 我的职责
- 列出技能的主要功能

### 使用场景
- 列出技能的典型使用情况

---

## 二、<主题1>

### 2.1 <子主题>

内容...

---

## 三、<主题2>

...
```

### 5.2 内容组织原则

- 使用 Markdown 格式编写
- 层级标题使用 `##`、`###`、`####`
- 列表使用 `-` 或 `1.` 格式
- 代码块使用 ` ``` ` 包裹
- 表格使用标准 Markdown 表格格式

### 5.3 示例模板

```markdown
## 一、职责范围

### 我的职责
- 功能点1
- 功能点2
- 功能点3

### 使用场景
- 场景1
- 场景2

---

## 二、<主题>

### 2.1 <子主题>

代码示例：
```typescript
// 示例代码
```

### 2.2 表格示例

| 列1 | 列2 | 说明 |
|------|------|------|
| 值1 | 值2 | 描述 |
```

---

## 六、创建技能流程

### 6.1 步骤

1. **确定技能名称** - 遵循命名规则
2. **创建目录** - `.txcode/skills/<name>/`
3. **编写 SKILL.md** - 按本规范编写
4. **验证格式** - 检查 frontmatter 和内容

### 6.2 快速创建命令

```bash
# 创建技能目录和文件
mkdir -p .txcode/skills/<name>
touch .txcode/skills/<name>/SKILL.md
```

### 6.3 最小示例

```markdown
---
name: my-skill
description: 这是一个示例技能
---

## 一、职责范围

### 我的职责
- 实现具体功能

### 使用场景
- 需要此功能时使用
```

---

## 七、注意事项

### 7.1 常见错误

| 错误类型 | 错误示例 | 正确做法 |
|----------|----------|----------|
| 名称大写 | `Api-Docs` | `api-docs` |
| 使用下划线 | `api_docs` | `api-docs` |
| 描述过长 | 超过1024字符 | 精简描述 |
| 缺少frontmatter | 无 YAML 头 | 必须包含 |

### 7.2 最佳实践

- 描述要具体，便于 AI 选择合适的技能
- 内容结构清晰，便于阅读和维护
- 包含足够的示例，便于理解和应用
- 定期审查和更新技能内容
