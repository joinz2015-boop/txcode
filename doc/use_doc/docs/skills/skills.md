# 技能 (Skills)

技能（Skills）是 txCode 的扩展功能模块，可以为 AI 提供特定领域的专业知识和工作流程。

## 什么是技能

技能是一组预定义的指令和工作流程，通过 YAML frontmatter 和 Markdown 内容组成。当 AI 需要执行特定任务时，可以加载对应的技能来获得更专业的指导。

## 技能目录

技能文件存放在以下目录中：

```
.txcode/skills/           # 项目目录（优先加载）
.claude/skills/
.agents/skills/
~/.txcode/skills/         # 用户目录
~/.claude/skills/
~/.agents/skills/
```

系统会按顺序搜索这些目录，加载所有找到的技能。

## 技能文件结构

每个技能是一个目录，目录中包含 `SKILL.md` 文件：

```
my-skill/
└── SKILL.md
```

### SKILL.md 格式

```markdown
---
name: my-skill
description: 技能描述
license: MIT
compatibility: txcode >= 1.0.0
---

技能内容...

## 工作流程

1. 步骤一
2. 步骤二

## 资源

- 脚本: `scripts/run.sh`
- 模板: `templates/xxx.yaml`
```

### Frontmatter 字段

| 字段 | 必填 | 说明 |
|------|------|------|
| `name` | 是 | 技能名称（需与目录名一致） |
| `description` | 是 | 技能描述 |
| `license` | 否 | 许可证 |
| `compatibility` | 否 | 兼容性要求 |

### 命名规范

- 目录名和 `name` 必须一致
- 只能使用小写字母、数字和连字符
- 不能以连字符开头或结尾
- 不能包含连续的点号
- 最多 64 个字符

正确示例：`git-release`、`code-review`、`api-doc-generator`

## 在 CLI 中使用

### 查看可用技能

```
/skills
```

显示所有已加载的技能列表。

### 激活技能

```
/use <技能名>
```

激活指定技能，将技能内容注入当前对话上下文。

## 在代码中调用

```typescript
import { skillsManager } from './modules/skill/index.js';

// 加载所有技能
await skillsManager.loadAll();

// 获取技能
const skill = skillsManager.getSkill('git-release');

// 获取可用技能列表
const available = skillsManager.getAvailableSkills();
```

## 技能工具

txCode 提供 `skill` 工具供 AI 调用：

```xml
<skill>
  <name>code-review</name>
</skill>
```

AI 可以识别任务需求后自动加载对应的技能。

## 内置技能

### git-release

用于创建标准化版本发布和更新日志。

```markdown
---
name: git-release
description: Create consistent releases and changelogs
---
```

## 记忆功能

### 会话消息管理

txCode 自动管理会话中的所有消息，包括：

- **用户消息** (`user`)：用户输入
- **助手消息** (`assistant`)：AI 回复
- **系统消息** (`system`)：系统指令
- **工具消息** (`tool`)：工具执行结果

### 消息类型

#### 永久消息 (keepContext = true)

- 保留在会话历史中
- 发送给 AI 作为上下文
- 可以被压缩但不会被删除

#### 临时消息 (keepContext = false)

- 仅用于当前对话轮次
- 不会被发送给 AI
- 压缩时会被删除

### 会话压缩

当会话消息过多时，系统会自动压缩：

- 生成摘要消息记录压缩点
- 删除旧的永久消息
- 保留最近的 N 条消息
- 后续消息从摘要点之后开始

### CLI 命令

```
/compact    # 手动压缩当前会话
/token      # 显示 Token 统计
/clear      # 清除当前会话
```

## 创建自定义技能

### 步骤 1：创建技能目录

```bash
mkdir -p .txcode/skills/my-custom-skill
```

### 步骤 2：编写 SKILL.md

```markdown
---
name: my-custom-skill
description: 我的自定义技能
---

# 我的自定义技能

## 用途
描述技能的用途...

## 使用方法
1. 第一步
2. 第二步

## 注意事项
- 注意点一
- 注意点二
```

### 步骤 3：验证技能

在 CLI 中运行：

```
/skills
```

确认技能已出现在列表中。

## 技能开发建议

1. **描述清晰**：frontmatter 中的 description 要准确描述技能用途
2. **结构化内容**：使用 Markdown 标题组织内容
3. **示例代码**：提供具体的使用示例
4. **错误处理**：说明常见的错误场景和处理方式
5. **资源路径**：相对路径是相对于技能的基础目录
