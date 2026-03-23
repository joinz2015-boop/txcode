# 方案：XML 内容格式化工具

## 1. 需求背景

在 ReAct 模式中，工具执行结果需要返回给 AI 模型。当工具输出文件内容时，如果使用简单的 XML 标签格式，内容中可能包含与标签冲突的字符串（如 `<content>` 或 `</content>`）。

opencode 使用简单的 XML 标签格式但没有处理冲突问题。本方案采用 CDATA 机制来解决这个问题。

## 2. 解决方案

### 2.1 核心原理

- 使用 XML 标签 `<xml></xml>` 包裹内容
- 如果内容中包含 XML 敏感标签（`<`、`>` 开头且符合 XML 标签特征），则使用 `<![CDATA[...]]>` 包裹
- CDATA 内部的所有内容都会被当作纯文本，不会被解析为 XML

### 2.2 标签定义

```typescript
const TAGS = {
  xml: '<xml>',        // XML 内容块开始
  xmlEnd: '</xml>',    // XML 内容块结束
  cdataStart: '<![CDATA[',  // CDATA 开始
  cdataEnd: ']]>',         // CDATA 结束
}
```

### 2.3 检测逻辑

```typescript
/**
 * 检测内容是否需要使用 CDATA 包裹
 * 如果内容包含 XML 结束标签或可能干扰解析的内容，则返回 true
 */
function needsCDATA(content: string): boolean {
  // 检查是否包含 XML 结束标签
  if (content.includes(TAGS.xmlEnd)) {
    return true
  }
  
  // 检查是否包含 CDATA 本身（嵌套问题）
  if (content.includes(TAGS.cdataStart) || content.includes(']]>')) {
    return true
  }
  
  // 检查是否包含可能冲突的标签模式
  // 例如：<path>, <type>, <content>, </content> 等
  const conflictPatterns = [
    /<\/?(path|type|content|entries|file|error|result|metadata)>/gi,
  ]
  
  for (const pattern of conflictPatterns) {
    if (pattern.test(content)) {
      return true
    }
  }
  
  return false
}
```

### 2.4 格式化函数

```typescript
interface FormatOptions {
  /** 自定义标签，用于区分不同类型的内容 */
  tag?: string
  /** 是否添加行号前缀 */
  lineNumbers?: boolean
  /** 行号起始值 */
  lineOffset?: number
}

interface FormatResult {
  /** 格式化后的内容 */
  content: string
  /** 是否使用了 CDATA */
  useCDATA: boolean
  /** 使用的标签名 */
  tag: string
}

/**
 * 格式化内容为 XML 格式
 */
function formatAsXML(
  content: string,
  options: FormatOptions = {}
): FormatResult {
  const {
    tag = 'content',
    lineNumbers = false,
    lineOffset = 1,
  } = options
  
  const openTag = `<${tag}>`
  const closeTag = `</${tag}>`
  
  // 处理行号
  let processedContent = content
  if (lineNumbers) {
    const lines = content.split('\n')
    processedContent = lines
      .map((line, index) => `${index + lineOffset}: ${line}`)
      .join('\n')
  }
  
  // 检测是否需要 CDATA
  const useCDATA = needsCDATA(processedContent)
  
  let formatted: string
  if (useCDATA) {
    formatted = `${openTag}${TAGS.cdataStart}${processedContent}${TAGS.cdataEnd}${closeTag}`
  } else {
    formatted = `${openTag}${processedContent}${closeTag}`
  }
  
  return {
    content: formatted,
    useCDATA,
    tag,
  }
}
```

### 2.5 处理 CDATA 嵌套

如果内容中已经包含 `]]>`，需要进一步处理：

```typescript
/**
 * 处理 CDATA 内部可能存在的冲突
 */
function escapeForCDATA(content: string): string {
  // CDATA 中不能出现 ]]>
  // 如果出现，需要拆分处理
  return content.replace(/]]>/g, ']]>]<![CDATA[>')
}
```

## 3. 使用示例

### 3.1 Read 工具输出

```typescript
// 原始文件内容
const fileContent = `1: <project>
2:   <name>myproject</name>
3:   <config>
4:     <debug>true</debug>
5:   </config>
6: </project>`

// 格式化输出
const result = formatAsXML(fileContent, { 
  tag: 'content',
  lineNumbers: false 
})

// 输出（包含 CDATA）
// <content><![CDATA[
// <project>
//   <name>myproject</name>
//   <config>
//     <debug>true</debug>
//   </config>
// </project>
// ]]></content>
```

### 3.2 Bash 工具输出

```typescript
const bashOutput = 'Total: 150 items\n<error>Connection failed</error>'

const result = formatAsXML(bashOutput, { tag: 'output' })

// 输出（包含 CDATA，因为包含 </error>）
// <output><![CDATA[Total: 150 items
// <error>Connection failed</error>
// ]]></output>
```

### 3.3 简单文本（不需要 CDATA）

```typescript
const simpleText = 'Hello, World! This is plain text.'

const result = formatAsXML(simpleText, { tag: 'result' })

// 输出（不需要 CDATA）
// <result>Hello, World! This is plain text.</result>
```

## 4. 完整工具模块

创建文件：`src/modules/ai/utils/xml-formatter.ts`

```typescript
/**
 * XML 内容格式化工具
 * 用于解决工具输出内容与 XML 标签冲突的问题
 */

// 预定义的 XML 标签
const XML_TAGS = {
  xmlOpen: '<xml>',
  xmlClose: '</xml>',
  cdataStart: '<![CDATA[',
  cdataEnd: ']]>',
} as const

// 可能与工具输出冲突的标签模式
const CONFLICT_PATTERNS = [
  /<\/?(path|type|content|entries|file|error|result|metadata|bash_metadata)>/gi,
]

/**
 * 检测内容是否需要 CDATA 包裹
 */
export function needsCDATA(content: string): boolean {
  // 包含 XML 结束标签
  if (content.includes('</')) {
    // 进一步检查是否是有效的 XML 标签结尾
    const endTagPattern = /<\/[a-zA-Z][a-zA-Z0-9-]*>/g
    if (endTagPattern.test(content)) {
      return true
    }
  }
  
  // 包含 CDATA 本身
  if (content.includes(XML_TAGS.cdataStart) || content.includes(']]>')) {
    return true
  }
  
  // 检查冲突模式
  for (const pattern of CONFLICT_PATTERNS) {
    if (pattern.test(content)) {
      return true
    }
  }
  
  return false
}

/**
 * 预处理 CDATA 内容，处理嵌套问题
 */
function prepareForCDATA(content: string): string {
  // CDATA 中不能出现 ]]>
  // 如果出现 ]]>，将其拆分
  return content.replace(/]]>/g, ']]>]<![CDATA[>')
}

export interface FormatXMLOptions {
  /** XML 标签名，默认 'content' */
  tag?: string
  /** 是否添加行号 */
  lineNumbers?: boolean
  /** 行号起始偏移 */
  lineOffset?: number
  /** 自定义头部信息 */
  header?: Record<string, string>
}

export interface FormatXMLResult {
  /** 格式化后的完整 XML 字符串 */
  xml: string
  /** 是否使用了 CDATA */
  useCDATA: boolean
  /** 使用的标签名 */
  tag: string
}

/**
 * 格式化内容为 XML 格式
 * 
 * @example
 * const result = formatAsXML('Hello <world>', { tag: 'output' })
 * // result.xml = '<output><![CDATA[Hello <world>]]></output>'
 * // result.useCDATA = true
 */
export function formatAsXML(content: string, options: FormatXMLOptions = {}): FormatXMLResult {
  const {
    tag = 'content',
    lineNumbers = false,
    lineOffset = 1,
    header,
  } = options

  const openTag = `<${tag}>`
  const closeTag = `</${tag}>`

  // 处理行号
  let processedContent = content
  if (lineNumbers) {
    const lines = content.split('\n')
    processedContent = lines
      .map((line, index) => `${index + lineOffset}: ${line}`)
      .join('\n')
  }

  // 检测是否需要 CDATA
  const useCDATA = needsCDATA(processedContent)

  // 构建 XML
  let xml: string
  
  if (header) {
    const headerParts = Object.entries(header)
      .map(([key, value]) => `<${key}>${escapeXMLValue(value)}</${key}>`)
      .join('\n')
    xml = `${headerParts}\n${openTag}`
  } else {
    xml = openTag
  }

  if (useCDATA) {
    const prepared = prepareForCDATA(processedContent)
    xml += `${XML_TAGS.cdataStart}${prepared}${XML_TAGS.cdataEnd}`
  } else {
    xml += processedContent
  }

  xml += closeTag

  return {
    xml,
    useCDATA,
    tag,
  }
}

/**
 * 转义 XML 属性值
 */
function escapeXMLValue(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * 解析 XML 格式内容（用于测试或反向处理）
 */
export function parseXMLContent(xml: string): { content: string; useCDATA: boolean } | null {
  // 尝试提取 CDATA 内容
  const cdataMatch = xml.match(/<!\[CDATA\[([\s\S]*?)\]\]>/)
  if (cdataMatch) {
    return {
      content: cdataMatch[1],
      useCDATA: true,
    }
  }
  
  // 尝试提取普通文本内容
  const contentMatch = xml.match(/>([^<]+)</)
  if (contentMatch) {
    return {
      content: contentMatch[1],
      useCDATA: false,
    }
  }
  
  return null
}
```

## 5. 集成到工具系统

### 5.1 Read 工具改造

```typescript
// src/modules/ai/tools/read.tool.ts

import { formatAsXML } from '../utils/xml-formatter'

export async function readFile(params: {
  filePath: string
  offset?: number
  limit?: number
}) {
  // ... 读取文件逻辑 ...
  
  const content = rawContent
  
  // 格式化为 XML
  const result = formatAsXML(content, {
    tag: 'content',
    lineNumbers: true,
    lineOffset: offset,
    header: {
      path: filePath,
      type: 'file',
    },
  })
  
  return {
    content: result.xml,
    metadata: {
      useCDATA: result.useCDATA,
      truncated,
    }
  }
}
```

### 5.2 Bash 工具改造

```typescript
// src/modules/ai/tools/bash.tool.ts

import { formatAsXML } from '../utils/xml-formatter'

export async function executeBash(params: {
  command: string
  workdir?: string
}) {
  // ... 执行命令逻辑 ...
  
  const output = stdout + stderr
  
  // 格式化为 XML
  const result = formatAsXML(output, {
    tag: 'output',
    header: {
      exitCode: exitCode.toString(),
    },
  })
  
  return {
    content: result.xml,
    metadata: {
      useCDATA: result.useCDATA,
    }
  }
}
```

## 6. 注意事项

1. **CDATA 嵌套**：`]]>` 不能出现在 CDATA 内部，已做替换处理
2. **性能**：对于大量内容，CDATA 检测有少量正则开销
3. **兼容性**：CDATA 语法所有 XML 解析器都支持
4. **可读性**：非冲突内容仍然保持明文，AI 可以直接阅读

## 7. 测试用例

```typescript
// tests/xml-formatter.test.ts

import { formatAsXML, needsCDATA } from '../src/modules/ai/utils/xml-formatter'

describe('XML Formatter', () => {
  test('plain text does not need CDATA', () => {
    expect(needsCDATA('Hello World')).toBe(false)
    expect(needsCDATA('Line 1\nLine 2')).toBe(false)
  })

  test('content with XML tags needs CDATA', () => {
    expect(needsCDATA('<html>content</html>')).toBe(true)
    expect(needsCDATA('</error>')).toBe(true)
  })

  test('content with conflict patterns needs CDATA', () => {
    expect(needsCDATA('<path>/usr/local</path>')).toBe(true)
    expect(needsCDATA('<content>test</content>')).toBe(true)
  })

  test('formatAsXML wraps in CDATA when needed', () => {
    const result = formatAsXML('<html>test</html>', { tag: 'output' })
    expect(result.useCDATA).toBe(true)
    expect(result.xml).toContain('<![CDATA[')
  })

  test('formatAsXML keeps plain text without CDATA', () => {
    const result = formatAsXML('Hello World', { tag: 'output' })
    expect(result.useCDATA).toBe(false)
    expect(result.xml).toBe('<output>Hello World</output>')
  })
})
```

## 8. 后续优化方向

1. **流式输出优化**：对于大文件，考虑分段 CDATA
2. **智能标签检测**：基于文件类型动态调整冲突标签列表
3. **压缩模式**：对于极大输出，考虑 base64 编码
