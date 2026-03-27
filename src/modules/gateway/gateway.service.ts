import { v4 as uuidv4 } from 'uuid';
import { configService } from '../config/index.js';
import { sessionService } from '../session/index.js';
import { memoryService } from '../memory/index.js';
import { aiService } from '../ai/index.js';
import { toolService } from '../tools/index.js';
import { skillsManager } from '../skill/index.js';
import { dingtalkAdapter } from './adapters/dingtalk.adapter.js';
import { gatewayQueue } from './gateway.queue.js';
import { DingtalkConfig, DingtalkMessage, GatewayStatus, QueuedMessage } from './gateway.types.js';

export class GatewayService {
  private config: DingtalkConfig = {
    enabled: false,
    clientId: '',
    clientSecret: '',
  };
  private status: GatewayStatus = {
    running: false,
    config: this.config,
  };
  private userSessions: Map<string, string> = new Map();
  private configLoaded: boolean = false;

  async start(): Promise<void> {
    if (this.status.running) {
      return;
    }

    process.env.NO_PROXY = '*';
    process.env.no_proxy = '*';
    process.env.HTTP_PROXY = '';
    process.env.HTTPS_PROXY = '';
    process.env.http_proxy = '';
    process.env.https_proxy = '';

    this.loadConfig();

    if (!this.config.enabled || !this.config.clientId || !this.config.clientSecret) {
      throw new Error('Gateway configuration is incomplete or disabled');
    }

    dingtalkAdapter.registerHandler(this.handleMessage.bind(this));
    await dingtalkAdapter.start({
      clientId: this.config.clientId,
      clientSecret: this.config.clientSecret,
    });

    this.status.running = true;
    this.status.connectedAt = Date.now();
    this.status.config = { ...this.config };
  }

  async stop(): Promise<void> {
    if (!this.status.running) {
      return;
    }

    await dingtalkAdapter.stop();
    gatewayQueue.clear();
    this.status.running = false;
    this.status.connectedAt = undefined;
  }

  isRunning(): boolean {
    return this.status.running;
  }

  getStatus(): GatewayStatus {
    return { ...this.status };
  }

  getConfig(): DingtalkConfig {
    this.loadConfig();
    return { ...this.config };
  }

  updateConfig(config: Partial<DingtalkConfig>): void {
    const wasRunning = this.status.running;
    
    if (wasRunning) {
      this.stop();
    }

    this.config = {
      ...this.config,
      ...config,
    };

    configService.updateDingdingConfig({
      enabled: this.config.enabled,
      clientId: this.config.clientId,
      clientSecret: this.config.clientSecret,
      botName: this.config.botName,
    });
    
    this.status.config = { ...this.config };

    if (wasRunning && this.config.enabled) {
      this.start();
    }
  }

  getQueueStatus() {
    return gatewayQueue.getStatus();
  }

  private loadConfig(): void {
    if (this.configLoaded) {
      return;
    }
    try {
      const saved = configService.getDingdingConfig();
      this.config = { ...saved };
      this.status.config = { ...this.config };
      this.configLoaded = true;
    } catch (e) {
      console.error('Failed to load gateway config:', e);
    }
  }

  private async handleMessage(message: DingtalkMessage): Promise<void> {
    console.log('[Gateway] handleMessage called', { message });
    const userId = message.senderId || message.senderStaffId || 'unknown';
    const userName = message.senderNick || 'Unknown User';
    const content = message.text?.content?.trim() || '';

    console.log('[Gateway] Parsed message:', { userId, userName, content });

    if (!content) {
      console.log('[Gateway] No content, skipping');
      return;
    }

    if (content === '/help') {
      await this.sendHelp(userName);
      return;
    }

    if (content === '/new') {
      this.createNewSession(userId, userName);
      return;
    }

    const queuedMessage: QueuedMessage = {
      id: uuidv4(),
      userId,
      userName,
      content,
      sessionId: this.userSessions.get(userId),
      messageId: message.msgId,
      timestamp: Date.now(),
    };

    if (gatewayQueue.isProcessing(userId)) {
      gatewayQueue.enqueue(queuedMessage);
      return;
    }

    await this.processMessage(queuedMessage);
  }

  private async processMessage(msg: QueuedMessage): Promise<void> {
    const sessionId = this.getOrCreateSession(msg.userId, msg.userName);
    msg.sessionId = sessionId;
    this.userSessions.set(msg.userId, sessionId);

    gatewayQueue.setProcessing({
      userId: msg.userId,
      sessionId,
      messageId: msg.messageId || msg.id,
    });

    console.log('[Gateway] Starting AI processing for:', msg.content);

    try {
      await this.sendThinking('正在处理...');

      await aiService.chatWithTools(msg.content, {
        sessionId,
        projectPath: process.cwd(),
        onStep: (step: any) => {
          if (step.actions && step.actions.length > 0) {
            for (const action of step.actions) {
              this.sendToolStart(action.actionName, action.actionInput);
            }
          }
          if (step.observation) {
            const observation = typeof step.observation === 'string' 
              ? step.observation 
              : JSON.stringify(step.observation);
            this.sendToolResult(observation);
          }
        },
      });

      this.sendFinalResponse('处理完成');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (errorMsg !== 'ABORTED') {
        this.sendToolError(errorMsg);
        this.sendFinalResponse(`处理出错: ${errorMsg}`);
      }
    } finally {
      gatewayQueue.clearProcessing(msg.userId);
      this.processNext(msg.userId);
    }
  }

  private processNext(userId: string): void {
    const next = gatewayQueue.getNext(userId);
    if (next) {
      gatewayQueue.removeUser(userId);
      setTimeout(() => {
        this.processMessage(next);
      }, 100);
    }
  }

  private getOrCreateSession(userId: string, userName?: string): string {
    const existing = this.userSessions.get(userId);
    if (existing) {
      return existing;
    }
    return this.createNewSession(userId, userName);
  }

  private createNewSession(userId: string, userName?: string): string {
    const session = sessionService.create(`DingTalk - ${userName || userId}`);
    this.userSessions.set(userId, session.id);
    
    this.sendReply('已创建新会话，请开始提问。');
    
    return session.id;
  }

  private sendReply(message: string): void {
    console.log('[Gateway] sendReply:', message.substring(0, 100));
    dingtalkAdapter.sendReply(message);
  }

  private formatToolStart(toolName: string, params: Record<string, any>): string {
    let paramsStr = '';
    if (params) {
      paramsStr = Object.entries(params)
        .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
        .join(', ');
    }
    return `[工具] ${toolName}\n[参数] ${paramsStr}`;
  }

  private sendToolStart(toolName: string, params: Record<string, any>): void {
    const log = this.formatToolStart(toolName, params);
    this.sendReply(log);
  }

  private sendToolResult(result: string): void {
    const truncated = result.length > 500 ? result.substring(0, 500) + '...' : result;
    this.sendReply(`[结果] ${truncated}`);
  }

  private sendToolError(error: string): void {
    this.sendReply(`[错误] ${error}`);
  }

  private sendThinking(thinking: string): void {
    this.sendReply(`[思考] ${thinking}`);
  }

  private sendFinalResponse(content: string): void {
    this.sendReply(content);
  }

  private async sendHelp(userName: string): Promise<void> {
    const tools = await toolService.getAll();
    const skillInfos = await skillsManager.loadAll().then(() => skillsManager.getAllSkills());

    let helpText = `@${userName} 可用工具：\n\n`;

    if (tools.length > 0) {
      helpText += '【内置工具】\n';
      for (const tool of tools.slice(0, 10)) {
        helpText += `${tool.name}: ${tool.description}\n`;
      }
      if (tools.length > 10) {
        helpText += `... 还有 ${tools.length - 10} 个工具\n`;
      }
    }

    if (skillInfos.length > 0) {
      helpText += '\n【技能】\n';
      for (const skill of skillInfos.slice(0, 5)) {
        helpText += `${skill.name}: ${skill.description}\n`;
      }
    }

    helpText += '\n---\n特殊命令：\n/help - 显示此帮助\n/new - 创建新会话';

    this.sendReply(helpText);
  }
}

export const gatewayService = new GatewayService();
