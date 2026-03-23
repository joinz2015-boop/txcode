#!/usr/bin/env node
/**
 * TXCode - AI Coding Assistant
 * 
 * 主入口文件
 * - CLI 模式：使用 Ink 渲染 React 组件，实现终端交互界面
 * - Web 模式：启动 Express 服务，提供 Web API 和前端界面
 * 
 * 使用方式：
 *   npm run dev          -> 启动 CLI 交互模式
 *   npm run dev web      -> 启动 Web 服务
 *   npm run dev web --port 40001 -> 指定端口启动 Web 服务
 */

import { parseArgs } from './cli/args.js';

/**
 * 程序主入口函数
 * 
 * 执行流程：
 * 1. 解析命令行参数 (parseArgs)
 * 2. 根据参数判断启动模式：
 *    - 'web' -> 启动 Web 服务 (Express)
 *    - 其他  -> 启动 CLI 终端界面 (Ink + React)
 * 
 * @returns {Promise<void>} 程序异步执行完成
 */
async function main() {
  // ========== 步骤 1: 解析命令行参数 ==========
  // process.argv 包含 Node.js 运行时和脚本路径后的所有参数
  // 例如：['node', 'index.ts', 'web', '--port', '40001']
  const args = parseArgs(process.argv);
  
  // ========== 步骤 2: 根据参数决定启动模式 ==========
  if (args.command === 'web') {
    /**
     * Web 模式：启动 Express Web 服务
     * 
     * 执行内容：
     * 1. 动态导入 WebService 类 (延迟加载，减少 CLI 模式的内存占用)
     * 2. 创建 WebService 实例，传入端口号
     * 3. 调用 start() 启动服务
     * 
     * Web 服务功能：
     * - /health 健康检查端点
     * - /api/* API 路由 (聊天、会话、配置、技能)
     * - 静态文件服务 (Vue 前端构建产物)
     * - SPA 路由 fallback
     */
    const { WebService } = await import('./web/web.service.js');
    const webService = new WebService(args.port);
    await webService.start();
  } else {
    /**
     * CLI 模式：启动终端交互界面
     * 
     * 使用 Ink 库渲染 React 组件到终端
     * Ink 是一个类似 React 的库，但渲染目标是终端而不是浏览器
     * 
     * 执行内容：
     * 1. 动态导入 Ink 的 render 函数
     * 2. 动态导入 React (Ink 依赖 React)
     * 3. 动态导入 App 主组件
     * 4. 使用 render() 渲染 App 组件到终端
     * 
     * App 组件功能：
     * - 接收用户键盘输入
     * - 显示聊天消息历史
     * - 处理命令 (/help, /model 等)
     * - 调用 AI 服务处理用户问题
     * - 显示 AI 思考过程和工具调用
     */
    const { render } = await import('ink');
    const React = await import('react');
    const { App } = await import('./components/App.js');
    render(React.createElement(App));
  }
}

// ========== 程序入口 ==========
// 捕获并打印未处理的异常，防止进程崩溃
main().catch(console.error);