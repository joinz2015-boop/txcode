import { ToolDefinition } from '../../../ai/ai.types.js';

export const openaiTools: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'read_file',
      description: '读取文件或目录内容。参数：file_path(必填), offset(可选), limit(可选)',
      parameters: {
        type: 'object',
        properties: {
          file_path: { type: 'string', description: '文件或目录绝对路径' },
          offset: { type: 'number', description: '起始行号，从1开始（可选，默认1）' },
          limit: { type: 'number', description: '最大读取行数（可选，默认2000）' },
        },
        required: ['file_path'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'edit_file',
      description: '对文件执行精确的字符串替换。编辑前必须先读取文件。参数：file_path, old_string, new_string, replace_all(可选)',
      parameters: {
        type: 'object',
        properties: {
          file_path: { type: 'string', description: '文件绝对路径' },
          old_string: { type: 'string', description: '要被替换的内容（必须精确匹配）' },
          new_string: { type: 'string', description: '替换后的新内容' },
          replace_all: { type: 'boolean', description: '是否替换所有匹配项（可选，默认false）' },
        },
        required: ['file_path', 'old_string', 'new_string'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'write_file',
      description: '写入文件到本地文件系统。如果路径已存在文件会报错。参数：file_path, content',
      parameters: {
        type: 'object',
        properties: {
          file_path: { type: 'string', description: '文件绝对路径' },
          content: { type: 'string', description: '要写入的内容' },
        },
        required: ['file_path', 'content'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'bash',
      description: '在持久化 shell 会话中执行命令。参数：command(必填), workdir(可选), timeout(可选)',
      parameters: {
        type: 'object',
        properties: {
          command: { type: 'string', description: '要执行的命令' },
          workdir: { type: 'string', description: '工作目录（可选）' },
          timeout: { type: 'number', description: '超时时间，毫秒（可选，默认120000）' },
        },
        required: ['command'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'glob',
      description: '快速的文件模式匹配工具。参数：pattern(必填), directory(可选)',
      parameters: {
        type: 'object',
        properties: {
          pattern: { type: 'string', description: 'glob 模式，如 "**/*.ts"' },
          directory: { type: 'string', description: '搜索目录的绝对路径（可选）' },
        },
        required: ['pattern'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'grep',
      description: '使用正则表达式搜索文件内容。参数：pattern(必填), directory(可选), include(可选)',
      parameters: {
        type: 'object',
        properties: {
          pattern: { type: 'string', description: '正则表达式模式' },
          directory: { type: 'string', description: '搜索目录（可选）' },
          include: { type: 'string', description: '文件模式过滤，如 "*.ts"（可选）' },
        },
        required: ['pattern'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'memory',
      description: '获取项目的记忆列表。此工具不需要参数。',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'code_search',
      description: '使用 Exa Code API 搜索编程相关的代码和上下文。参数：query(必填), tokens(可选)',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: '搜索查询字符串' },
          tokens: { type: 'number', description: '返回的 token 数量（可选，1000-50000，默认5000）' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'web_fetch',
      description: '从指定 URL 获取内容。参数：url(必填), format(可选)',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: '要获取的 URL' },
          format: { type: 'string', description: '输出格式：markdown, text, html（可选，默认markdown）' },
        },
        required: ['url'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'web_search',
      description: '使用 Exa AI 搜索网络。参数：query(必填), numResults(可选), type(可选)',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: '搜索查询字符串' },
          numResults: { type: 'number', description: '返回结果数量（可选，默认8）' },
          type: { type: 'string', description: '搜索类型：auto, fast, deep（可选，默认auto）' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'lsp',
      description: '与语言服务器协议（LSP）服务器交互。参数：action(必填), filePath(可选), line(可选), character(可选), query(可选)',
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', description: 'LSP 操作：gotoDefinition, findReferences, hover, documentSymbol, workspaceSymbol, gotoImplementation, callHierarchy' },
          file_path: { type: 'string', description: '文件路径' },
          line: { type: 'number', description: '行号（1-indexed）' },
          character: { type: 'number', description: '字符位置（0-indexed）' },
          query: { type: 'string', description: '搜索查询（workspaceSymbol 操作需要）' },
        },
        required: ['action'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'todowrite',
      description: '创建和管理任务列表。参数：todos(必填)',
      parameters: {
        type: 'object',
        properties: {
          todos: {
            type: 'array',
            description: '任务数组，每个任务包含 content, status, priority',
            items: {
              type: 'object',
              properties: {
                content: { type: 'string', description: '任务内容' },
                status: { type: 'string', description: '状态：pending, in_progress, completed, cancelled' },
                priority: { type: 'string', description: '优先级：high, medium, low' },
              },
              required: ['content', 'status'],
            },
          },
        },
        required: ['todos'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'todoread',
      description: '读取当前会话的任务列表。此工具不需要参数。',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
];
