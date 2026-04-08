---
name: spec-authoring
description: 编写和创建SPEC.md规范文件的规范与指南。包含文件结构、frontmatter格式、章节组织、内容模板。适用于创建新规范、审查规范完整性、批量生成规范时使用。
license: MIT
compatibility: txcode
metadata:
  audience: developers
  workflow: txcode
---

## 一、职责范围

### 我的职责
- 规范 SPEC.md 规范文件的编写格式
- 确保规范文件包含完整的结构和必要章节
- 指导规范的目录结构、内容组织、模板使用

### 使用场景
在以下情况下使用我：
- 创建新的规范文件时
- 审查规范文件的完整性
- 批量生成规范文件
- 优化现有规范结构

---

## 二、文件放置规范

### 2.1 目录结构

规范文件放置在 `.txcode/specs/<name>/` 目录：

```
.txcode/specs/
├── document-spec/
│   └── SPEC.md
├── front-develop/
│   └── SPEC.md
├── python-develop/
│   └── SPEC.md
└── <new-spec>/
    └── SPEC.md
```

### 2.2 加载方式

规范文件通过 `read_mode` 属性控制加载时机：
- `read_mode: required` - 开发任务必须阅读
- `read_mode: optional` - 按需加载（默认）

### 2.3 与 SKILL 的区别

| 特性 | SPEC | SKILL |
|------|------|-------|
| 用途 | 规范约束 | 能力指导 |
| 加载 | 按需或必读 | 主动调用 |
| 触发 | 任务类型匹配 | skill 工具调用 |
| 时机 | 任务开始前 | 任务执行中 |

---

## 三、文件结构

### 3.1 必选结构

每个 SPEC.md 必须包含：

1. **YAML frontmatter** - 文件头部元数据
2. **正文内容** - 规范的具体章节

### 3.2 Frontmatter 格式

```yaml
---
name: <spec-name>
description: <规范的描述>
read_mode: required  # required | optional
---
```

#### Frontmatter 字段说明

| 字段 | 必填 | 说明 |
|------|------|------|
| name | 是 | 规范名称 |
| description | 是 | 规范描述，说明适用范围 |
| read_mode | 是 | 加载模式 |

---

## 四、正文内容规范

### 4.1 章节结构建议

```
## 一、<概述/简介>

简要介绍规范的背景、目的、适用范围

---

## 二、<核心主题1>

### 2.1 <子主题>

详细说明...

### 2.2 <子主题>

代码示例、配置示例

---

## 三、<核心主题2>

### 3.1 <子主题>

...
```

### 4.2 内容组织原则

- 使用 Markdown 格式编写
- 层级标题使用 `##`、`###`、`####`
- 使用分隔线 `---` 分隔主要章节
- 列表使用 `-` 或 `1.` 格式
- 代码块使用 ` ``` ` 包裹，标注语言
- 表格使用标准 Markdown 表格格式

### 4.3 目录结构展示

使用代码块展示目录结构：
````markdown
```
项目/
├── src/
│   ├── components/
│   └── utils/
└── tests/
```
````

### 4.4 表格使用

推荐使用表格展示对比、参数说明等结构化数据：

```markdown
| 列1 | 列2 | 说明 |
|------|------|------|
| 值1 | 值2 | 描述 |
```

---

## 五、编写模板

### 5.1 基础模板

```markdown
---
name: my-spec
description: 规范的描述，说明适用范围和使用场景
---

## 一、概述

简要介绍规范的背景和目的

---

## 二、核心规范

### 2.1 命名规范

具体的命名规则说明

### 2.2 目录结构

目录结构规范

### 2.3 代码规范

代码编写规范

---

## 三、示例

### 3.1 正确示例

```代码示例
```

### 3.2 错误示例

```代码示例
```

---

## 四、注意事项

- 注意点1
- 注意点2
```

### 5.2 带必读标识的模板

```markdown
---
name: required-spec
description: 开发任务必须遵循的规范
read_mode: required
---

## 一、职责范围

### 何时使用
- 场景1
- 场景2

---

## 二、规范内容

...
```

---

## 六、创建规范流程

### 6.1 步骤

1. **确定规范名称** - 简洁、有意义
2. **确定加载模式** - required 或 optional
3. **创建目录** - `.txcode/specs/<name>/`
4. **编写 SPEC.md** - 按本规范编写
5. **验证完整性** - 检查结构和内容

### 6.2 快速创建命令

```bash
# 创建规范目录和文件
mkdir -p .txcode/specs/<name>
touch .txcode/specs/<name>/SPEC.md
```

### 6.3 最小示例

```markdown
---
name: my-spec
description: 这是一个示例规范
---

## 一、概述

规范的具体内容

---

## 二、规则

- 规则1
- 规则2
```

---

## 七、常见错误

| 错误类型 | 错误示例 | 正确做法 |
|----------|----------|----------|
| 缺少 frontmatter | 无 YAML 头 | 必须包含 name 和 description |
| read_mode 值错误 | `required: true` | 使用 `read_mode: required` |
| 章节混乱 | 无层级结构 | 使用 ##、### 分层 |
| 内容空洞 | 只有标题 | 每个章节有实质内容 |
