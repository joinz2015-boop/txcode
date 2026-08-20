/**
 * 分级日志模块
 *
 * 对齐 txcode-sdk（Python logging）语义：
 * - 级别映射：debug=10 < info=20 < warning=30 < error=40
 * - 日志格式：`2026-08-19 14:00:00 [DEBUG] [模块名] 消息`（对齐 sdk `%(asctime)s %(levelname)s %(name)s | %(message)s`）
 * - 输出目标：stdout（error 级走 stderr），指定 --log-file 时同时 UTF-8 追加写入文件
 * - --log-level warning/error 时降噪：拦截包装 console.log/console.info 为静默，
 *   保留 console.warn/console.error 输出（对齐 sdk warning/error 关闭高频 INFO）
 * - log_enabled 语义：debug/info 级别下 Agent 循环日志开启（isLogEnabled()），warning/error 关闭
 */

import * as fs from 'fs';

export const LOG_LEVELS = { debug: 10, info: 20, warning: 30, error: 40 } as const;
export type LogLevel = keyof typeof LOG_LEVELS;

const LEVEL_LABELS: Record<LogLevel, string> = {
  debug: 'DEBUG',
  info: 'INFO',
  warning: 'WARNING',
  error: 'ERROR',
};

// 保存原始 console 方法，用于 setupLogging 反复调用时的降噪/恢复
const originalConsoleLog = console.log.bind(console);
const originalConsoleInfo = console.info.bind(console);

let currentLevel: number = LOG_LEVELS.info;
let logFile: string | undefined;

function formatTime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function formatArgs(args: any[]): string {
  if (args.length === 0) return '';
  return ' ' + args.map(a => {
    if (typeof a === 'string') return a;
    try {
      return JSON.stringify(a);
    } catch {
      return String(a);
    }
  }).join(' ');
}

/** 规范化模块名：调用方可写 'CodeWebSocket' 或 '[CodeWebSocket]'，输出统一为 [CodeWebSocket] */
function normalizeModuleName(moduleName: string): string {
  const trimmed = moduleName.trim();
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function writeLine(level: LogLevel, moduleName: string, message: string, args: any[]): void {
  const line = `${formatTime(new Date())} [${LEVEL_LABELS[level]}] [${normalizeModuleName(moduleName)}] ${message}${formatArgs(args)}`;
  if (level === 'error') {
    process.stderr.write(line + '\n');
  } else {
    process.stdout.write(line + '\n');
  }
  if (logFile) {
    try {
      fs.appendFileSync(logFile, line + '\n', 'utf-8');
    } catch {
      // 日志文件写入失败不影响主流程
    }
  }
}

/**
 * 装配全局日志级别（在 main() 中最先调用）
 * - 设置全局级别与可选文件写入
 * - warning/error 级别时包装 console.log/console.info 为静默（降噪）
 * - debug/info 级别时恢复原始 console.log/console.info
 */
export function setupLogging(opts: { logLevel: LogLevel; logFile?: string }): void {
  currentLevel = LOG_LEVELS[opts.logLevel] ?? LOG_LEVELS.info;
  logFile = opts.logFile;

  if (currentLevel >= LOG_LEVELS.warning) {
    console.log = () => {};
    console.info = () => {};
  } else {
    console.log = originalConsoleLog;
    console.info = originalConsoleInfo;
  }
}

/** 是否 debug 级别（level <= debug），用于高频调试埋点开关 */
export function isDebugEnabled(): boolean {
  return currentLevel <= LOG_LEVELS.debug;
}

/** 是否开启 Agent 循环日志（level <= info，对齐 sdk log_enabled） */
export function isLogEnabled(): boolean {
  return currentLevel <= LOG_LEVELS.info;
}

export const log = {
  debug(moduleName: string, message: string, ...args: any[]): void {
    if (currentLevel <= LOG_LEVELS.debug) writeLine('debug', moduleName, message, args);
  },
  info(moduleName: string, message: string, ...args: any[]): void {
    if (currentLevel <= LOG_LEVELS.info) writeLine('info', moduleName, message, args);
  },
  warn(moduleName: string, message: string, ...args: any[]): void {
    if (currentLevel <= LOG_LEVELS.warning) writeLine('warning', moduleName, message, args);
  },
  error(moduleName: string, message: string, ...args: any[]): void {
    if (currentLevel <= LOG_LEVELS.error) writeLine('error', moduleName, message, args);
  },
};
