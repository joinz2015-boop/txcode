/**
 * Web 服务模块
 * 
 * 本模块提供 TXCode 的 Web 服务功能，使用 Express 框架构建
 * 
 * 主要功能：
 * 1. HTTP 服务器 - 监听指定端口，接受客户端请求
 * 2. 中间件配置 - CORS、JSON 解析、URL 编码
 * 3. API 路由 - 提供聊天、会话、配置、技能等 RESTful API
 * 4. 静态文件服务 - 提供 Vue 前端构建产物
 * 5. SPA 路由支持 - 所有非 API 路由返回 index.html (支持前端路由)
 * 6. 健康检查 - /health 端点用于服务健康检测
 * 7. 优雅关闭 - 处理 SIGTERM/SIGINT 信号，正确关闭数据库连接
 * 
 * 端口配置：默认 40000，可通过命令行参数 --port 指定
 */

import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import * as path from 'path';
import * as fs from 'fs';
import * as readline from 'readline';
import * as http from 'http';
import { exec } from 'child_process';
import { WebSocketServer, WebSocket } from 'ws';
import { apiRouter } from '../api/index.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageRoot = path.resolve(__dirname, '..', '..');
import { dbService } from '../modules/db/db.service.js';
import { aiService } from '../modules/ai/index.js';
import { sessionService } from '../modules/session/index.js';
import { memoryService } from '../modules/memory/index.js';
import { configService } from '../modules/config/config.service.js';
import { logger } from '../modules/logger/logger.js';

/**
 * WebService 类
 * 
 * 封装 Express Web 服务器的创建、配置和启动逻辑
 * 
 * 使用示例：
 *   const webService = new WebService(40000);
 *   await webService.start();
 */
export class WebService {
  private app: Express;
  private port: number;
  private server: http.Server | null = null;
  private wss: WebSocketServer | null = null;
  private wsClients: Set<WebSocket> = new Set();
  private abortControllers: Map<string, AbortController> = new Map();

  /**
   * 构造函数
   * 
   * @param port - 服务监听端口，默认 40000
   * 
   * 初始化流程：
   * 1. 保存端口号
   * 2. 创建 Express 应用实例
   * 3. 调用 setupMiddleware() 配置中间件
   * 4. 调用 setupRoutes() 配置路由
   */
  constructor(port: number = 40000) {
    this.port = port;
    this.app = express();
    this.setupMiddleware();   // 配置中间件
    this.setupRoutes();       // 配置路由
  }

  /**
   * 配置中间件
   * 
   * 中间件是在请求处理管道中执行的函数，可以在请求到达路由之前进行预处理
   * 
   * 配置的中间件：
   * 1. cors() - 跨域资源共享，允许浏览器访问不同域名的资源
   *    - 用于开发环境，前端可能运行在不同的端口
   *    - 生产环境应配置具体的允许域名
   * 
   * 2. express.json() - JSON 请求体解析
   *    - limit: '10mb' - 允许最大 10MB 的请求体
   *    - 用于解析 POST 请求中的 JSON 数据
   * 
   * 3. express.urlencoded() - URL 编码请求体解析
   *    - extended: true - 允许使用高级 URL 编码
   *    - 用于解析表单提交的数据
   */
  private setupMiddleware(): void {
    // CORS 中间件 - 允许跨域请求
    this.app.use(cors());
    
    // JSON 解析中间件 - 解析 JSON 请求体
    this.app.use(express.json({ limit: '10mb' }));
    
    // URL 编码解析中间件 - 解析表单数据
    this.app.use(express.urlencoded({ extended: true }));
  }

  /**
   * 配置路由
   * 
   * 路由是请求路径与处理函数之间的映射
   * 
   * 路由结构：
   * - GET  /health         -> 健康检查 (返回服务状态和时间戳)
   * - /api/*               -> API 路由 (见 apiRouter)
   * - 静态文件             -> Vue 前端构建产物
   * - GET  /{*splat}       -> SPA fallback (所有非 API 路由返回 index.html)
   */
  private setupRoutes(): void {
    /**
     * 健康检查端点
     * 
     * 用途：
     * 1. Kubernetes/负载均衡器 健康探测
     * 2. 监控服务是否正常运行
     * 3. 获取服务启动时间
     * 
     * 响应示例：
     *   {
     *     "status": "ok",
     *     "timestamp": "2024-01-01T00:00:00.000Z"
     *   }
     */
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString() 
      });
    });

    /**
     * API 路由注册
     * 
     * 所有 /api/* 路径的请求都会路由到 apiRouter
     * apiRouter 在 src/api/index.ts 中定义，包含：
     * - /api/chat      -> 聊天 API (发送消息、流式响应、历史记录)
     * - /api/sessions  -> 会话管理 API (CRUD)
     * - /api/config    -> 配置管理 API (AI 提供商、模型)
     * - /api/skills    -> 技能管理 API
     */
    this.app.use('/api', apiRouter);

    /**
     * 静态文件服务与 SPA fallback
     * 
     * 检查前端是否已构建：
     * - 如果 web/dist 目录存在，提供静态文件服务
     * - 如果不存在，返回提示信息
     * 
     * 静态文件服务配置：
     * - express.static() 会自动处理静态文件的 MIME 类型、缓存等
     * - 访问 http://localhost:40000/ 会返回 index.html
     * 
     * SPA 路由支持：
     * - 使用通配符路由 /{*splat} 捕获所有未匹配的请求
     * - 将请求重定向到 index.html，让前端路由处理
     * - 这样前端可以处理 /chat、/settings 等前端路由
     * - 跳过以 /api 开头的请求，返回 404
     */
    const devWebDistPath = path.join(process.cwd(), 'web', 'dist');
    const prodWebDistPath = path.join(packageRoot, 'web', 'dist');
    const webDistPath = fs.existsSync(devWebDistPath) ? devWebDistPath : prodWebDistPath;
    
    if (fs.existsSync(webDistPath)) {
      // ========== 静态文件服务模式 ==========
      // 前端已构建，提供静态文件服务
      this.app.use(express.static(webDistPath));

      /**
       * SPA Fallback 路由
       * 
       * 捕获所有非 API 请求，返回 index.html
       * 这样前端路由 (Vue Router) 可以处理路径
       * 
       * 处理逻辑：
       * 1. 检查请求路径是否以 /api 开头
       * 2. 如果是 API 请求，返回 404 (让 API 路由处理)
       * 3. 如果不是，返回 index.html
       */
      this.app.get('/{*splat}', (req: Request, res: Response) => {
        // 跳过 API 路由请求
        if (req.path.startsWith('/api')) {
          return res.status(404).json({
            success: false,
            error: 'Not Found',
          });
        }
        // 返回 index.html 让前端处理路由
        res.sendFile(path.join(webDistPath, 'index.html'));
      });
    } else {
      // ========== 前端未构建模式 ==========
      // 返回提示信息，指导用户构建前端
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

    /**
     * 错误处理中间件
     * 
     * 捕获所有未处理的错误，统一返回 JSON 格式的错误响应
     * 
     * 注意：Express 的错误处理中间件需要 4 个参数
     *       这样 Express 会识别它为错误处理中间件
     */
    this.app.use((err: Error, req: Request, res: Response, next: any) => {
      console.error('Error:', err.message);
      res.status(500).json({
        success: false,
        error: err.message,
      });
    });
  }

  /**
   * 启动 Web 服务
   * 
   * 启动流程：
   * 1. 初始化数据库 (dbService.init())
   * 2. 启动 Express 服务器监听指定端口
   * 3. 打印服务信息 (URL、API 文档)
   * 4. 注册信号处理器 (优雅关闭)
   * 
   * @returns {Promise<void>} 服务启动完成后 resolve
   * 
   * @throws {Error} 如果端口已被占用或其他网络错误
   */
  async start(): Promise<void> {
    await dbService.init();

    return new Promise((resolve, reject) => {
      this.server = http.createServer(this.app);
      
      this.wss = new WebSocketServer({ server: this.server });
      
      this.wss.on('connection', (ws: WebSocket) => {
        this.wsClients.add(ws);
        ws.send(JSON.stringify({ type: 'connected', message: 'WebSocket connected' }));
        
        ws.on('message', async (data: Buffer) => {
          try {
            const msg = JSON.parse(data.toString());
            await this.handleWsMessage(ws, msg);
          } catch (e) {
            ws.send(JSON.stringify({ type: 'error', error: 'Invalid message format' }));
          }
        });
        
        ws.on('close', () => {
          this.wsClients.delete(ws);
          for (const [sessionId, controller] of this.abortControllers.entries()) {
            controller.abort();
            this.abortControllers.delete(sessionId);
          }
        });
      });

      this.server.listen(this.port, () => {
        // ========== 步骤 3: 打印服务信息 ==========
        console.log(`TXCode Web 服务已启动: http://localhost:${this.port}`);
        
        const devWebDistPath = path.join(process.cwd(), 'web', 'dist');
        const prodWebDistPath = path.join(packageRoot, 'web', 'dist');
        const webDistPathForLog = fs.existsSync(devWebDistPath) ? devWebDistPath : prodWebDistPath;
        if (fs.existsSync(webDistPathForLog)) {
          console.log(`Web 界面: http://localhost:${this.port}`);
        } else {
          console.log(`提示: 前端未构建，请 cd web && npm install && npm run build`);
        }
        
        console.log(`API 文档: http://localhost:${this.port}/api`);
        console.log(`按 Ctrl+C 停止服务\n`);

        const url = `http://localhost:${this.port}`;
        if (process.platform === 'win32') {
          exec(`start ${url}`);
        } else if (process.platform === 'darwin') {
          exec(`open ${url}`);
        } else {
          exec(`xdg-open ${url}`);
        }

        /**
         * 优雅关闭处理器
         * 
         * 处理流程：
         * 1. 接收 SIGTERM (Docker/Kubernetes) 或 SIGINT (Ctrl+C) 信号
         * 2. 打印关闭提示
         * 3. 关闭 HTTP 服务器 (停止接受新请求)
         * 4. 关闭数据库连接
         * 5. 退出进程
         * 
         * 超时机制：
         * - 如果 3 秒内未正常关闭，强制退出进程
         * - 防止服务挂起无法退出
         */
        const shutdown = () => {
          console.log('\n正在关闭服务...');
          this.wss?.close();
          this.server?.close(() => {
            dbService.close();
            console.log('服务已关闭');
            process.exit(0);
          });
          setTimeout(() => {
            console.log('强制退出');
            process.exit(1);
          }, 3000);
        };

        // 注册信号处理器
        process.on('SIGTERM', shutdown);  // Docker/K8s 发送的终止信号
        process.on('SIGINT', shutdown);   // Ctrl+C 发送的中断信号

        // ========== Windows 平台特殊处理 ==========
        // Windows 上使用 readline 处理 Ctrl+C 事件
        // 注意：仅在 stdin 是 TTY 时添加 readline 处理
        // 否则在非交互模式下会立即触发 close 事件
        if (process.platform === 'win32' && process.stdin.isTTY) {
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
    });
  }

  private async handleWsMessage(ws: WebSocket, msg: any): Promise<void> {
    const { type, data } = msg;

    switch (type) {
      case 'chat':
        await this.handleChat(ws, data);
        break;
      case 'stop':
        this.handleStop(data);
        break;
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong' }));
        break;
      default:
        ws.send(JSON.stringify({ type: 'error', error: 'Unknown message type' }));
    }
  }

  private handleStop(data: any): void {
    const { sessionId } = data;
    if (!sessionId) return;
    
    const controller = this.abortControllers.get(sessionId);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(sessionId);
    }
  }

  private async handleChat(ws: WebSocket, data: any): Promise<void> {
    const { message, sessionId, projectPath } = data;

    const existingController = this.abortControllers.get(sessionId);
    if (existingController) {
      existingController.abort();
    }

    const abortController = new AbortController();
    this.abortControllers.set(sessionId, abortController);

    try {
      let session = sessionId ? sessionService.get(sessionId) : null;
      if (!session) {
        session = sessionService.create('New Chat', projectPath);
      }
      sessionService.switchTo(session.id);

      ws.send(JSON.stringify({ type: 'session', data: { sessionId: session.id } }));

      console.log('[WebSocket] Chat message:', message);

      console.log('[handleChat] calling chatWithTools, sessionId:', session.id, 'message:', message.substring(0, 20));

      const result = await aiService.chatWithTools(message, {
        sessionId: session.id,
        projectPath: session.projectPath || undefined,
        memoryService,
        abortSignal: abortController.signal,
        onStep: (step, iteration) => {
          const actions = (step.actions || []).map((a: { actionName: string; actionInput: any }) => ({
            actionName: a.actionName,
            input: typeof a.actionInput === 'string' 
              ? a.actionInput 
              : JSON.stringify(a.actionInput),
          }));
          
          const stepData = {
            iteration,
            thought: step.thought,
            actions,
            success: step.observation && !step.observation.error,
          };
          
          ws.send(JSON.stringify({ type: 'step', data: stepData }));

          if (actions.some((a: any) => a.actionName === 'todowrite') && step.observation?.metadata?.todos) {
            const todos = step.observation.metadata.todos;
            const formattedTodos = todos.map((t: any) => ({
              name: t.content || t.name || '',
              status: t.status || 'pending'
            }));
            ws.send(JSON.stringify({ type: 'todos', data: { todos: formattedTodos } }));
          }
        },
      });

      const lastStep = result.steps[result.steps.length - 1];
      const lastThought = lastStep && 'thought' in lastStep ? (lastStep as any).thought : undefined;
      const providerConfig = configService.getDefaultProvider();
      const models = providerConfig ? configService.getModels(providerConfig.id) : [];
      const defaultModel = models.find(m => m.enabled) || { name: 'gpt-4' };

      ws.send(JSON.stringify({
        type: 'done',
        data: {
          sessionId: session.id,
          response: result.answer || lastThought,
          iterations: result.iterations,
          success: result.success,
          modelName: defaultModel?.name || providerConfig?.name || 'unknown',
          usage: result.usage ? {
            promptTokens: result.usage.promptTokens,
            completionTokens: result.usage.completionTokens,
            totalTokens: result.usage.totalTokens,
          } : undefined,
        }
      }));
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      const isAbort = error instanceof Error && (
        error.name === 'AbortError' || 
        errorMsg === 'ABORTED' ||
        errorMsg.toLowerCase().includes('abort')
      );
      if (isAbort) {
        ws.send(JSON.stringify({
          type: 'stopped',
          reason: 'user_cancelled'
        }));
      } else {
        ws.send(JSON.stringify({
          type: 'error',
          error: errorMsg
        }));
      }
    } finally {
      this.abortControllers.delete(sessionId);
    }
  }

  public broadcast(message: any): void {
    const data = JSON.stringify(message);
    this.wsClients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  }

  getApp(): Express {
    return this.app;
  }
}
