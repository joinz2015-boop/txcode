/**
 * Web 服务
 * 
 * 使用 Express 启动 Web 服务
 * 支持：
 * - API 路由
 * - 静态文件服务（Vue 前端）
 * - SPA 路由支持
 */

import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import * as path from 'path';
import * as fs from 'fs';
import * as readline from 'readline';
import { apiRouter } from '../api/index.js';
import { dbService } from '../modules/db/db.service.js';

export class WebService {
  private app: Express;
  private port: number;

  constructor(port: number = 40000) {
    this.port = port;
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(cors());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));
  }

  private setupRoutes(): void {
    // 健康检查
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // API 路由
    this.app.use('/api', apiRouter);

    // 静态文件服务（Vue 前端）
    const webDistPath = path.join(process.cwd(), 'web', 'dist');
    
    if (fs.existsSync(webDistPath)) {
      // 静态资源
      this.app.use(express.static(webDistPath));

      // SPA 路由支持 - 所有非 API 路由返回 index.html
      this.app.get('/{*splat}', (req: Request, res: Response) => {
        // 跳过 API 路由
        if (req.path.startsWith('/api')) {
          return res.status(404).json({
            success: false,
            error: 'Not Found',
          });
        }
        res.sendFile(path.join(webDistPath, 'index.html'));
      });
    } else {
      // 没有前端构建产物，返回提示
      this.app.use('/{*splat}', (req: Request, res: Response) => {
        if (req.path.startsWith('/api')) {
          return res.status(404).json({
            success: false,
            error: 'Not Found',
          });
        }
        res.send(`
          <h1>TXCode Web</h1>
          <p>前端未构建。请运行以下命令：</p>
          <pre>
cd web
npm install
npm run build
          </pre>
          <p>或者使用开发模式：</p>
          <pre>
cd web
npm install
npm run dev
          </pre>
          <h2>API 文档</h2>
          <ul>
            <li>GET /api/config/providers - 获取提供商列表</li>
            <li>POST /api/config/providers - 添加提供商</li>
            <li>GET /api/config/models - 获取模型列表</li>
            <li>GET /api/sessions - 获取会话列表</li>
            <li>POST /api/chat - 发送聊天消息</li>
          </ul>
        `);
      });
    }

    // 错误处理
    this.app.use((err: Error, req: Request, res: Response, next: any) => {
      console.error('Error:', err.message);
      res.status(500).json({
        success: false,
        error: err.message,
      });
    });
  }

  async start(): Promise<void> {
    dbService.init();

    return new Promise((resolve, reject) => {
      const server = this.app.listen(this.port, () => {
        console.log(`TXCode Web 服务已启动: http://localhost:${this.port}`);
        
        const webDistPath = path.join(process.cwd(), 'web', 'dist');
        if (fs.existsSync(webDistPath)) {
          console.log(`Web 界面: http://localhost:${this.port}`);
        } else {
          console.log(`提示: 前端未构建，请 cd web && npm install && npm run build`);
        }
        
        console.log(`API 文档: http://localhost:${this.port}/api`);
        console.log(`按 Ctrl+C 停止服务\n`);

        const shutdown = () => {
          console.log('\n正在关闭服务...');
          server.close(() => {
            dbService.close();
            console.log('服务已关闭');
            process.exit(0);
          });
          setTimeout(() => {
            console.log('强制退出');
            process.exit(1);
          }, 3000);
        };

        process.on('SIGTERM', shutdown);
        process.on('SIGINT', shutdown);

        if (process.platform === 'win32') {
          const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
          });
          rl.on('close', () => {
            shutdown();
          });
        }

        resolve();
      });

      server.on('error', reject);
    });
  }

  getApp(): Express {
    return this.app;
  }
}
