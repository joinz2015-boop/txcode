#!/usr/bin/env node
/**
 * TXCode - AI Coding Assistant
 * 
 * 主入口文件
 * - CLI 模式：使用 Ink 渲染 React 组件
 * - Web 模式：启动 Express 服务
 */

import { parseArgs } from './cli/args.js';

/**
 * 主函数
 * 根据命令行参数决定启动模式
 */
async function main() {
  const args = parseArgs(process.argv);
  
  if (args.command === 'web') {
    // 启动 Web 服务
    const { WebService } = await import('./web/web.service.js');
    const webService = new WebService(args.port);
    await webService.start();
  } else {
    // 启动 CLI
    const { render } = await import('ink');
    const React = await import('react');
    const { App } = await import('./components/App.js');
    render(React.createElement(App));
  }
}

main().catch(console.error);