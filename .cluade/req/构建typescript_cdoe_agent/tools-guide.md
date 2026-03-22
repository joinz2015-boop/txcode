# Tools 模块设计

## 1. 内置工具列表

| 工具 | 功能 | 输入 | 输出 |
|------|------|------|------|
| `read_file` | 按行读取文件 | `path`, `startLine?`, `endLine?` | 文件内容（最多50行） |
| `write_file` | 新建文件 | `path`, `content` | 是否成功 |
| `edit_file` | 修改文件 | `path`, `oldContent`, `newContent` | 是否成功 |
| `grep` | 搜索文件内容 | `path`, `pattern`, `filePattern?` | 匹配结果列表 |
| `load_skill` | 加载 Skill | `name` | Skill 内容 |
| `execute_shell` | 执行 Shell 命令 | `cmd`, `cwd?` | 命令输出 |

---

## 2. 工具详细定义

### 2.1 read_file

```typescript
{
  name: 'read_file',
  description: '按行读取文件内容，每次最多50行',
  parameters: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: '文件路径'
      },
      startLine: {
        type: 'number',
        description: '起始行号（从1开始），默认1'
      },
      endLine: {
        type: 'number',
        description: '结束行号，默认50（最多50行）'
      }
    },
    required: ['path']
  }
}
```

**使用示例：**
```
read_file({ path: "src/App.tsx", startLine: 1, endLine: 50 })
```

### 2.2 write_file

```typescript
{
  name: 'write_file',
  description: '新建文件并写入内容（仅用于新建，不能覆盖已有文件）',
  parameters: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: '文件路径'
      },
      content: {
        type: 'string',
        description: '文件内容'
      }
    },
    required: ['path', 'content']
  }
}
```

**使用示例：**
```
write_file({ path: "src/components/Hello.tsx", content: "$content:1" })
```

### 2.3 edit_file

```typescript
{
  name: 'edit_file',
  description: '修改文件内容（替换指定老内容为新内容）',
  parameters: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: '文件路径'
      },
      oldContent: {
        type: 'string',
        description: '要被替换的老内容（必须精确匹配）'
      },
      newContent: {
        type: 'string',
        description: '替换后的新内容'
      }
    },
    required: ['path', 'oldContent', 'newContent']
  }
}
```

**使用示例：**
```
edit_file({ 
  path: "src/App.tsx", 
  oldContent: "const a = 1;", 
  newContent: "const a = 2;" 
})
```

### 2.4 grep

```typescript
{
  name: 'grep',
  description: '在文件或目录中搜索匹配的内容',
  parameters: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: '搜索路径（文件或目录）'
      },
      pattern: {
        type: 'string',
        description: '搜索模式（支持正则）'
      },
      filePattern: {
        type: 'string',
        description: '文件匹配模式，如 "*.ts"，默认 "*"'
      },
      maxResults: {
        type: 'number',
        description: '最大结果数，默认20'
      }
    },
    required: ['path', 'pattern']
  }
}
```

**使用示例：**
```
grep({ path: "src", pattern: "function\\s+\\w+", filePattern: "*.ts" })
```

### 2.5 load_skill

```typescript
{
  name: 'load_skill',
  description: '加载一个 Skill，获取其完整内容',
  parameters: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Skill 名称'
      }
    },
    required: ['name']
  }
}
```

**使用示例：**
```
load_skill({ name: "react-helper" })
```

### 2.6 execute_shell

```typescript
{
  name: 'execute_shell',
  description: '执行 Shell 命令',
  parameters: {
    type: 'object',
    properties: {
      cmd: {
        type: 'string',
        description: '要执行的命令'
      },
      cwd: {
        type: 'string',
        description: '工作目录，默认项目根目录'
      },
      timeout: {
        type: 'number',
        description: '超时时间(ms)，默认30000'
      }
    },
    required: ['cmd']
  }
}
```

**使用示例：**
```
execute_shell({ cmd: "git status", cwd: "/project" })
```

---

## 3. 工具实现

### 3.1 read_file

```typescript
// modules/tools/read-file.tool.ts

import * as fs from 'fs';
import * as path from 'path';

export async function readFileTool(
  args: { path: string; startLine?: number; endLine?: number },
  ctx: ToolContext
): Promise<ToolResult> {
  const filePath = path.resolve(ctx.projectPath, args.path);
  
  // 安全检查
  if (!filePath.startsWith(ctx.projectPath)) {
    return { success: false, error: 'Access denied: path outside project' };
  }

  if (!fs.existsSync(filePath)) {
    return { success: false, error: `File not found: ${args.path}` };
  }

  if (fs.statSync(filePath).isDirectory()) {
    return { success: false, error: 'Path is a directory, use listDir instead' };
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    const startLine = Math.max(1, args.startLine || 1);
    const endLine = Math.min(startLine + 49, args.endLine || 50, lines.length);
    const maxLines = endLine - startLine + 1;
    
    // 最多50行限制
    if (maxLines > 50) {
      return { success: false, error: 'Cannot read more than 50 lines at once' };
    }

    const selectedLines = lines.slice(startLine - 1, endLine);
    
    return {
      success: true,
      data: {
        path: args.path,
        totalLines: lines.length,
        startLine,
        endLine,
        content: selectedLines.join('\n'),
      }
    };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
```

### 3.2 write_file

```typescript
// modules/tools/write-file.tool.ts

import * as fs from 'fs';
import * as path from 'path';

export async function writeFileTool(
  args: { path: string; content: string },
  ctx: ToolContext
): Promise<ToolResult> {
  const filePath = path.resolve(ctx.projectPath, args.path);
  
  // 安全检查
  if (!filePath.startsWith(ctx.projectPath)) {
    return { success: false, error: 'Access denied: path outside project' };
  }

  // 检查文件是否已存在（只能新建）
  if (fs.existsSync(filePath)) {
    return { success: false, error: `File already exists: ${args.path}. Use edit_file to modify.` };
  }

  try {
    // 创建目录
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(filePath, args.content, 'utf-8');
    
    return {
      success: true,
      data: {
        path: args.path,
        bytes: Buffer.byteLength(args.content, 'utf-8'),
      }
    };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
```

### 3.3 edit_file

```typescript
// modules/tools/edit-file.tool.ts

import * as fs from 'fs';
import * as path from 'path';

export async function editFileTool(
  args: { path: string; oldContent: string; newContent: string },
  ctx: ToolContext
): Promise<ToolResult> {
  const filePath = path.resolve(ctx.projectPath, args.path);
  
  // 安全检查
  if (!filePath.startsWith(ctx.projectPath)) {
    return { success: false, error: 'Access denied: path outside project' };
  }

  if (!fs.existsSync(filePath)) {
    return { success: false, error: `File not found: ${args.path}` };
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // 检查老内容是否存在
    if (!content.includes(args.oldContent)) {
      return { success: false, error: 'oldContent not found in file' };
    }

    // 替换
    const newContent = content.replace(args.oldContent, args.newContent);
    fs.writeFileSync(filePath, newContent, 'utf-8');
    
    return {
      success: true,
      data: {
        path: args.path,
        replacements: (content.match(new RegExp(args.oldContent.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length,
      }
    };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
```

### 3.4 grep

```typescript
// modules/tools/grep.tool.ts

import * as fs from 'fs';
import * as path from 'path';

export async function grepTool(
  args: { path: string; pattern: string; filePattern?: string; maxResults?: number },
  ctx: ToolContext
): Promise<ToolResult> {
  const searchPath = path.resolve(ctx.projectPath, args.path);
  
  // 安全检查
  if (!searchPath.startsWith(ctx.projectPath)) {
    return { success: false, error: 'Access denied: path outside project' };
  }

  const maxResults = args.maxResults || 20;
  const results: any[] = [];

  try {
    const regex = new RegExp(args.pattern);
    const filePattern = args.filePattern || '*';

    function matchPattern(filename: string, pattern: string): boolean {
      const regexPattern = pattern
        .replace(/\./g, '\\.')
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.');
      return new RegExp(`^${regexPattern}$`).test(filename);
    }

    function search(dir: string) {
      if (results.length >= maxResults) return;

      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (results.length >= maxResults) break;

        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
            search(fullPath);
          }
        } else if (matchPattern(entry.name, filePattern)) {
          try {
            const content = fs.readFileSync(fullPath, 'utf-8');
            const lines = content.split('\n');
            
            lines.forEach((line, idx) => {
              if (results.length >= maxResults) return;
              if (regex.test(line)) {
                results.push({
                  file: path.relative(ctx.projectPath, fullPath),
                  line: idx + 1,
                  content: line.trim(),
                });
              }
            });
          } catch {
            // 忽略无法读取的文件
          }
        }
      }
    }

    search(searchPath);

    return {
      success: true,
      data: { results }
    };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
```

### 3.5 execute_shell

```typescript
// modules/tools/execute-shell.tool.ts

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function executeShellTool(
  args: { cmd: string; cwd?: string; timeout?: number },
  ctx: ToolContext
): Promise<ToolResult> {
  const cwd = args.cwd || ctx.projectPath;
  const timeout = args.timeout || 30000;

  try {
    const { stdout, stderr } = await execAsync(args.cmd, {
      cwd,
      timeout,
      maxBuffer: 10 * 1024 * 1024, // 10MB
    });

    return {
      success: true,
      data: {
        stdout,
        stderr,
        exitCode: 0,
      }
    };
  } catch (e: any) {
    return {
      success: false,
      error: e.stderr || e.message,
      data: {
        stdout: e.stdout || '',
        stderr: e.stderr || '',
        exitCode: e.code || 1,
      }
    };
  }
}
```

---

## 4. Tools Manager

```typescript
// modules/tools/tools.manager.ts

import { ToolDefinition, ToolResult, ToolContext } from './tools.types';
import { readFileTool } from './read-file.tool';
import { writeFileTool } from './write-file.tool';
import { editFileTool } from './edit-file.tool';
import { grepTool } from './grep.tool';
import { executeShellTool } from './execute-shell.tool';

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required: string[];
  };
}

export interface ToolContext {
  projectPath: string;
  sessionId: string;
}

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
}

export class ToolsManager {
  private tools: Map<string, ToolDefinition> = new Map();
  private handlers: Map<string, Function> = new Map();

  constructor() {
    this.registerBuiltinTools();
  }

  private registerBuiltinTools() {
    // read_file
    this.register({
      name: 'read_file',
      description: '按行读取文件内容，每次最多50行',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: '文件路径' },
          startLine: { type: 'number', description: '起始行号（从1开始）' },
          endLine: { type: 'number', description: '结束行号（最多50行）' },
        },
        required: ['path']
      }
    }, readFileTool);

    // write_file
    this.register({
      name: 'write_file',
      description: '新建文件并写入内容（仅用于新建）',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: '文件路径' },
          content: { type: 'string', description: '文件内容' },
        },
        required: ['path', 'content']
      }
    }, writeFileTool);

    // edit_file
    this.register({
      name: 'edit_file',
      description: '修改文件内容（替换老内容为新内容）',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: '文件路径' },
          oldContent: { type: 'string', description: '要被替换的老内容' },
          newContent: { type: 'string', description: '替换后的新内容' },
        },
        required: ['path', 'oldContent', 'newContent']
      }
    }, editFileTool);

    // grep
    this.register({
      name: 'grep',
      description: '在文件或目录中搜索内容',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: '搜索路径' },
          pattern: { type: 'string', description: '搜索模式（支持正则）' },
          filePattern: { type: 'string', description: '文件匹配模式，如 "*.ts"' },
          maxResults: { type: 'number', description: '最大结果数' },
        },
        required: ['path', 'pattern']
      }
    }, grepTool);

    // execute_shell
    this.register({
      name: 'execute_shell',
      description: '执行 Shell 命令',
      parameters: {
        type: 'object',
        properties: {
          cmd: { type: 'string', description: '要执行的命令' },
          cwd: { type: 'string', description: '工作目录' },
          timeout: { type: 'number', description: '超时时间(ms)' },
        },
        required: ['cmd']
      }
    }, executeShellTool);
  }

  register(definition: ToolDefinition, handler: Function) {
    this.tools.set(definition.name, definition);
    this.handlers.set(definition.name, handler);
  }

  getTool(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  getAllTools(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  async execute(name: string, args: any, ctx: ToolContext): Promise<ToolResult> {
    const handler = this.handlers.get(name);
    if (!handler) {
      return { success: false, error: `Tool not found: ${name}` };
    }

    try {
      return await handler(args, ctx);
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  toFunctionDefinitions(): any[] {
    return this.getAllTools().map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: {
          type: 'object',
          properties: tool.parameters.properties,
          required: tool.parameters.required,
        },
      },
    }));
  }
}

export const toolsManager = new ToolsManager();
```

---

## 5. 工具使用流程

```
AI 决定调用工具
    │
    ▼
toolsManager.execute(toolName, args, ctx)
    │
    ├── read_file  → readFileTool()
    ├── write_file → writeFileTool()
    ├── edit_file  → editFileTool()
    ├── grep       → grepTool()
    ├── load_skill → skillHandler()
    └── execute_shell → executeShellTool()
    │
    ▼
返回 ToolResult { success, data, error }
```
