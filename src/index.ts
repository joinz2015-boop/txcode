#!/usr/bin/env node
/**
 * TXCode - AI Coding Assistant
 *
 * 主入口文件（Web 模式）
 * - 默认启动 Web 服务（端口 40000，自动打开浏览器）
 * - 支持 --version / --help / --port / --log-level / --log-file
 * - desktop 为桌面端内部参数（启动后端时不自动打开浏览器）
 *
 * 使用方式：
 *   npm run dev                   -> 启动 Web 服务
 *   npm run dev -- --port 40001   -> 指定端口启动 Web 服务
 *   npm run dev -- --log-level debug -> debug 级别全环节日志
 */

import { setMaxListeners } from 'events';
setMaxListeners(20);

import { parseArgs, readVersion, helpText } from './args.js';
import { setupLogging, log } from './modules/logger/index.js';
import { dbService } from './core/db/index.js';
import { projectService } from './services/project/project.service.js';

/**
 * 程序主入口函数
 *
 * 执行流程：
 * 1. 解析命令行参数 (parseArgs)
 * 2. --version / --help 直接输出后退出
 * 3. 装配日志级别 (setupLogging)
 * 4. 初始化数据库与项目
 * 5. 端口占用自动顺延
 * 6. 启动 Web 服务 (Express + WebSocket)
 *
 * @returns {Promise<void>} 程序异步执行完成
 */
async function main() {
  const args = parseArgs(process.argv);

  if (args.showVersion) {
    console.log(readVersion());
    return;
  }
  if (args.showHelp) {
    console.log(helpText);
    return;
  }

  // 最先装配日志级别（--log-level debug 时后续环节全部输出详细日志）
  setupLogging({ logLevel: args.logLevel, logFile: args.logFile });
  log.debug('[Startup]', 'args:', JSON.stringify(args));

  await dbService.init();
  log.debug('[Startup]', 'db init completed');

  projectService.createOrGetProject();
  log.debug('[Startup]', 'project loaded:', projectService.getCurrentProjectPath());

  const { syncOnStartup } = await import('./services/system/device-sync.service.js');
  syncOnStartup();
  log.debug('[Startup]', 'syncOnStartup triggered');

  // 端口占用自动顺延
  const net = await import('net');

  async function findAvailablePort(port: number): Promise<number> {
    return new Promise((resolve) => {
      const server = net.createServer();
      server.listen(port, () => {
        server.close(() => resolve(port));
      });
      server.on('error', async () => {
        const nextPort = await findAvailablePort(port + 1);
        resolve(nextPort);
      });
    });
  }

  const availablePort = await findAvailablePort(args.port);
  if (availablePort !== args.port) {
    log.warn('[Startup]', `端口 ${args.port} 被占用，使用端口 ${availablePort}`);
  }
  log.debug('[Startup]', 'available port:', availablePort);
  process.env.TXCODE_BACKEND_PORT = String(availablePort);

  const { WebService } = await import('./gateway/server/web.server.js');
  const webService = new WebService(availablePort);
  await webService.start({ noBrowser: args.noBrowser });
}

// ========== 程序入口 ==========
// 捕获并打印未处理的异常，防止进程崩溃
main().catch(console.error);
