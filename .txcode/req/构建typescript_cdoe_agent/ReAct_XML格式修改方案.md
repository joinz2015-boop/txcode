# ReAct Prompt JSON → XML 格式修改方案

## 1. 修改目标

将 `react.prompts.ts` 中的输出格式从 JSON 改为 XML，避免文件内容中的 `}` 或 `"` 等字符破坏 JSON 格式。

## 2. 修改策略

### 2.1 新 XML 格式定义

**调用普通工具时：**
```xml
<react>
  <thought>你的思考过程</thought>
  <action>工具名称</action>
  <action_input>
    <参数名>参数值</参数名>
  </action_input>
  <keep_context>true</keep_context>
</react>
```

**调用 writeFile/editFile 时（内容用 CDATA）：**
```xml
<react>
  <thought>需要创建一个组件</thought>
  <action>writeFile</action>
  <action_input>
    <path>src/components/Hello.tsx</path>
    <content><![CDATA[import React from 'react';
export const Hello = () => {
  return <div>Hello World</div>;
};]]></content>
  </action_input>
  <keep_context>true</keep_context>
</react>
```

**返回最终答案时（final_answer 用 CDATA）：**
```xml
<react>
  <thought>任务已完成</thought>
  <final_answer><![CDATA[详细的完成结果，可能包含各种内容]]></final_answer>
</react>
```

### 2.2 使用 CDATA 的场景

| 字段 | 原因 |
|------|------|
| `content` | writeFile/editFile 的文件内容，可能包含代码、XML 等 |
| `find` | editFile 的查找内容，可能包含特殊字符 |
| `replace` | editFile 的替换内容，可能包含特殊字符 |
| `final_answer` | 最终回答，可能包含各种内容 |

### 2.3 修改内容对照

**第 36-49 行：**

原始：
```typescript
## 输出格式（重要）

输出必须是有效的 JSON 对象，不要包含其他文本：

**调用工具时：**
```json
{
  "thought": "你的思考过程",
  "action": "工具名称",
  "action_input": {
    "参数名": "参数值"
  },
  "keep_context": true
}
```
```

修改为：
```typescript
## 输出格式（重要）

输出格式必须是有效的 XML，不要包含其他文本：

**调用工具时：**
```xml
<react>
  <thought>你的思考过程</thought>
  <action>工具名称</action>
  <action_input>
    <参数名>参数值</参数名>
  </action_input>
  <keep_context>true</keep_context>
</react>
```

**第 52-66 行：**

原始：
**大文本参数（如代码）使用占位符：**
```json
{
  "thought": "需要创建一个组件",
  "action": "writeFile",
  "action_input": {
    "path": "src/components/Hello.tsx",
    "content": "$content:1"
  },
  "keep_context": true
}
```
$content:1
实际的代码内容在这里

修改为：
**需要写入/编辑文件时，内容使用 CDATA 包裹：**
```xml
<react>
  <thought>需要创建一个组件</thought>
  <action>writeFile</action>
  <action_input>
    <path>src/components/Hello.tsx</path>
    <content><![CDATA[import React from 'react';
export const Hello = () => {
  return <div>Hello World</div>;
};]]></content>
  </action_input>
  <keep_context>true</keep_context>
</react>
```

**第 67-73 行：**

原始：
**返回最终答案时：**
```json
{
  "thought": "任务已完成",
  "final_answer": "详细的完成结果"
}
```

修改为：
**返回最终答案时：**
```xml
<react>
  <thought>任务已完成</thought>
  <final_answer><![CDATA[详细的完成结果]]></final_answer>
</react>
```

**第 75-83 行字段说明表格：**
| 字段 | 类型 | 说明 |
|------|------|------|
| `thought` | string | 你的思考过程 |
| `action` | string | 要执行的工具名称 |
| `action_input` | object | 工具参数 |
| `keep_context` | boolean | 是否将此结果永久记忆并传递给下一轮（默认 false） |
| `final_answer` | string | 最终回答（仅在任务完成时使用），使用 CDATA 包裹 |

**第 93-100 行 skill 示例：**

原始：
```json
{
  "thought": "用户要求创建发布版本，我需要先查看 git-release Skill",
  "action": "skill",
  "action_input": {
    "name": "git-release"
  }
}
```

修改为：
```xml
<react>
  <thought>用户要求创建发布版本，我需要先查看 git-release Skill</thought>
  <action>skill</action>
  <action_input>
    <name>git-release</name>
  </action_input>
</react>
```

## 3. 修改清单

| 位置 | 修改内容 |
|------|---------|
| 36-49行 | JSON 示例 → XML 示例 |
| 52-66行 | JSON 占位符示例 → XML writeFile 示例 |
| 67-73行 | JSON 最终答案 → XML 最终答案（final_answer 用 CDATA） |
| 75-83行 | 字段说明表格更新 |
| 93-100行 | JSON skill 示例 → XML skill 示例 |

## 4. 注意事项

1. **CDATA 仅用于**：content、find、replace、final_answer 等可能包含特殊字符的字段
2. **普通字段不需要 CDATA**：action、path、name 等简单参数不需要
3. **简洁优先**：尽量保持 XML 简洁，只在必要时使用 CDATA
