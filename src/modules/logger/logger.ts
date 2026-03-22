/**
 * 日志工具模块
 * 
 * 职责：
 * - 记录AI请求/响应日志到文件
 * - 根据配置决定是否启用日志
 */

import * as fs from 'fs';
import * as path from 'path';
import config from '../../config/tx.config.js';

export interface AccessLogEntry {
  timestamp: string;
  type: 'request' | 'response';
  url: string;
  data: any;
}

class Logger {
  private logDir: string;
  private enabled: boolean;

  constructor() {
    this.enabled = config.log.enabled;
    this.logDir = config.log.dir;
    this.ensureLogDir();
  }

  private ensureLogDir(): void {
    if (!this.enabled) return;
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  private getLogPath(): string {
    return path.join(this.logDir, config.log.accessLog);
  }

  logRequest(url: string, data: any): void {
    if (!this.enabled) return;

    const entry: AccessLogEntry = {
      timestamp: new Date().toISOString(),
      type: 'request',
      url,
      data,
    };

    this.appendLog(entry);
  }

  logResponse(url: string, data: any): void {
    if (!this.enabled) return;

    const entry: AccessLogEntry = {
      timestamp: new Date().toISOString(),
      type: 'response',
      url,
      data,
    };

    this.appendLog(entry);
  }

  private appendLog(entry: AccessLogEntry): void {
    const logPath = this.getLogPath();
    const separator = '\n' + '='.repeat(80) + '\n';
    const logLine = separator + JSON.stringify(entry, null, 2) + '\n';
    
    fs.appendFileSync(logPath, logLine, 'utf-8');
  }
}

export const logger = new Logger();
