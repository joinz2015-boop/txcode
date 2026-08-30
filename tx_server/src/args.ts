/**
 * 命令行参数解析模块
 *
 * 职责：
 * - 解析 txcode 启动参数，仅保留 Web 模式必需选项
 * - 提供 --version / --help / --port / --log-level / --log-file 支持
 * - desktop 为桌面端内部参数（启动后端时不自动打开浏览器）
 *
 * 解析规则：
 * - txcode                              -> command=web, port=40000, logLevel=info
 * - txcode --port 40001 / -p 40001      -> 指定端口
 * - txcode --version / -v               -> showVersion=true
 * - txcode --help / -h                  -> showHelp=true
 * - txcode --log-level debug            -> logLevel=debug
 * - txcode --log-level debug --log-file server.log -> 同时写入文件
 * - txcode desktop --port 41000         -> command=desktop, noBrowser=true
 */

import * as fs from 'fs';
import * as path from 'path';

export const LOG_LEVEL_VALUES = ['debug', 'info', 'warning', 'error'] as const;
export type LogLevelArg = (typeof LOG_LEVEL_VALUES)[number];

export interface Args {
  /** 启动模式：web（默认）| desktop（桌面端内部使用） */
  command: 'web' | 'desktop';
  /** 服务端口，默认 40000 */
  port: number;
  /** 日志级别，默认 info */
  logLevel: LogLevelArg;
  /** 可选日志文件路径（UTF-8 追加写入） */
  logFile?: string;
  /** 是否只输出版本号后退出 */
  showVersion: boolean;
  /** 是否只输出帮助文档后退出 */
  showHelp: boolean;
  /** 是否不自动打开浏览器（desktop 时为 true） */
  noBrowser: boolean;
}

const DEFAULT_ARGS: Args = {
  command: 'web',
  port: 40000,
  logLevel: 'info',
  showVersion: false,
  showHelp: false,
  noBrowser: false,
};

/** 判断是否为 txcode 项目 package.json（避免误读 node_modules 中的包） */
function isTxPackage(pkg: any): boolean {
  return !!pkg && typeof pkg.version === 'string' &&
    (pkg.name === 'tianxincode' || (pkg.bin && pkg.bin.txcode));
}

/** 查找 txcode package.json 路径 */
function findPackageJson(): string {
  const entry = process.argv[1];
  if (entry) {
    const dir = path.dirname(path.resolve(entry));
    // 入口脚本目录及其父目录：
    // - dev: tsx src/index.ts        -> src/.. = 项目根
    // - prod: node dist/index.js     -> dist/.. = 项目根
    // - 打包: app/dist/index.js      -> app/dist/.. = app 目录
    for (const d of [path.join(dir, '..'), dir]) {
      const candidate = path.join(d, 'package.json');
      try {
        if (fs.existsSync(candidate) && isTxPackage(JSON.parse(fs.readFileSync(candidate, 'utf-8')))) {
          return candidate;
        }
      } catch { }
    }
  }
  // fallback：从 cwd 向上查找（测试环境等）
  let dir = process.cwd();
  while (true) {
    const candidate = path.join(dir, 'package.json');
    try {
      if (fs.existsSync(candidate) && isTxPackage(JSON.parse(fs.readFileSync(candidate, 'utf-8')))) {
        return candidate;
      }
    } catch { }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error('package.json not found');
}

/**
 * 从 package.json 读取版本号
 * 开发时 src/args.ts 与根 package.json 同级（../package.json）
 * 编译后 dist/args.js 与根 package.json 同级（../package.json）
 * 打包后 app/dist/ 与 app/package.json 同级，均可正确读取
 */
export function readVersion(): string {
  try {
    const pkg = JSON.parse(fs.readFileSync(findPackageJson(), 'utf-8'));
    return pkg.version || '0.0.0';
  } catch {
    return '0.0.0';
  }
}

export const helpText = `txcode - AI Coding Assistant

用法:
  txcode                启动服务（默认端口 40000，自动打开桌面页面）
  txcode --port <端口>  指定端口启动服务
  txcode --version      输出版本号
  txcode --help         显示帮助信息
  txcode --log-level <级别>  设置日志级别（debug/info/warning/error）

选项:
  -p, --port <端口>       指定服务端口（默认 40000）
  -l, --log-level <级别>  日志级别：debug/info/warning/error（默认 info）
      --log-file <路径>   日志文件路径（可选，UTF-8 追加写入）
  -v, --version           输出版本号
  -h, --help              显示帮助信息
`;

function parsePort(value: string): number {
  const port = parseInt(value, 10);
  return Number.isFinite(port) && port > 0 ? port : DEFAULT_ARGS.port;
}

function parseLogLevel(value: string): LogLevelArg {
  const level = value.toLowerCase();
  return (LOG_LEVEL_VALUES as readonly string[]).includes(level)
    ? (level as LogLevelArg)
    : DEFAULT_ARGS.logLevel;
}

/**
 * 解析命令行参数
 *
 * @param argv - Node.js process.argv（argv[0]=node, argv[1]=脚本路径）
 * @returns {Args} 解析后的参数对象
 */
export function parseArgs(argv: string[]): Args {
  const args: Args = { ...DEFAULT_ARGS };
  const tokens = argv.slice(2);

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (token === 'web' || token === 'desktop') {
      args.command = token;
      args.noBrowser = token === 'desktop';
      continue;
    }

    if (token === '--version' || token === '-v') {
      args.showVersion = true;
      continue;
    }

    if (token === '--help' || token === '-h') {
      args.showHelp = true;
      continue;
    }

    if (token === '--port' || token === '-p') {
      const value = tokens[i + 1];
      if (value !== undefined) {
        args.port = parsePort(value);
        i++;
      }
      continue;
    }

    if (token === '--log-level' || token === '-l') {
      const value = tokens[i + 1];
      if (value !== undefined) {
        args.logLevel = parseLogLevel(value);
        i++;
      }
      continue;
    }

    if (token.startsWith('--log-level=')) {
      args.logLevel = parseLogLevel(token.slice('--log-level='.length));
      continue;
    }

    if (token === '--log-file') {
      const value = tokens[i + 1];
      if (value !== undefined) {
        args.logFile = value;
        i++;
      }
      continue;
    }
  }

  // 显式指定 desktop 时强制 noBrowser
  if (args.command === 'desktop') {
    args.noBrowser = true;
  }
  return args;
}
