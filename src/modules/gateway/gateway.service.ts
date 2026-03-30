import { v4 as uuidv4 } from 'uuid';
import { configService } from '../config/index.js';
import { sessionService } from '../session/index.js';
import { memoryService } from '../memory/index.js';
import { OpenAIProvider } from '../ai/openai.provider.js';
import { ChatAgent } from '../ai/agents/chat/chat.agent.js';
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
  private accessToken: string | null = null;
  private accessTokenExpiry: number = 0;
  private unhandledRejectionHandler: ((reason: any) => void) | null = null;

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

    this.unhandledRejectionHandler = (reason: any) => {
      console.error('[Gateway] Unhandled promise rejection (non-fatal):', reason?.message || reason);
    };
    process.on('unhandledRejection', this.unhandledRejectionHandler);

    dingtalkAdapter.registerHandler(this.handleMessage.bind(this));
    
    try {
      await dingtalkAdapter.start({
        clientId: this.config.clientId,
        clientSecret: this.config.clientSecret,
      });
    } catch (error) {
      console.error('[Gateway] Initial connection failed, will retry in background:', error);
    }

    this.status.running = true;
    this.status.connectedAt = Date.now();
    this.status.config = { ...this.config };
  }

  async stop(): Promise<void> {
    if (!this.status.running) {
      return;
    }

    if (this.unhandledRejectionHandler) {
      process.off('unhandledRejection', this.unhandledRejectionHandler);
      this.unhandledRejectionHandler = null;
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

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.accessTokenExpiry) {
      return this.accessToken;
    }
    
    const GET_TOKEN_URL = 'https://api.dingtalk.com/gettoken';
    const response = await fetch(`${GET_TOKEN_URL}?appkey=${this.config.clientId}&appsecret=${this.config.clientSecret}`);
    const data = await response.json() as { access_token?: string; expire_in?: number };
    
    if (data.access_token) {
      this.accessToken = data.access_token;
      this.accessTokenExpiry = Date.now() + ((data.expire_in || 7200) - 300) * 1000;
      return this.accessToken;
    }
    throw new Error('Failed to get DingTalk access token');
  }

  private async sendToDingTalk(webhook: string, content: string): Promise<void> {
    try {
      const accessToken = await this.getAccessToken();
      
      const response = await fetch(webhook, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-acs-dingtalk-access-token': accessToken,
        },
        body: JSON.stringify({
          msgtype: 'text',
          text: { content },
        }),
      });

      const result = await response.json() as { errcode?: number; errmsg?: string };
      if (result.errcode !== 0) {
        console.error('[Gateway] sendToDingTalk error:', result);
      } else {
        console.log('[Gateway] sendToDingTalk success');
      }
    } catch (error) {
      console.error('[Gateway] sendToDingTalk failed:', error);
    }
  }

  private async handleMessage(message: DingtalkMessage): Promise<void> {
    console.log('[Gateway] handleMessage called', { message });
    const userId = message.senderStaffId || message.senderId || 'unknown';
    const userName = message.senderNick || 'Unknown User';
    const content = message.text?.content?.trim() || '';
    const webhook = message.sessionWebhook || '';

    console.log('[Gateway] Parsed message:', { userId, userName, content, webhook: webhook.substring(0, 50) });

    if (!content) {
      console.log('[Gateway] No content, skipping');
      return;
    }

    if (content === '/help') {
      await this.sendHelp(userName, webhook);
      return;
    }

    if (content === '/new') {
      this.userSessions.delete(userId);
      const sessionId = this.createNewSession(userId, userName, webhook);
      this.sendToDingTalk(webhook, '已创建新会话，请开始提问。');
      return;
    }

    const queuedMessage: QueuedMessage = {
      id: uuidv4(),
      userId,
      userName,
      content,
      sessionId: this.userSessions.get(userId),
      webhook,
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
    let sessionId = msg.sessionId;
    if (!sessionId) {
      sessionId = this.getOrCreateSession(msg.userId, msg.userName);
    } else {
      const existing = this.userSessions.get(msg.userId);
      if (existing && existing !== sessionId) {
        console.log('[Gateway] Warning: session mismatch, using existing');
        sessionId = existing;
      }
    }
    msg.sessionId = sessionId;
    this.userSessions.set(msg.userId, sessionId);

    console.log('[Gateway] Using session:', sessionId, 'for user:', msg.userId);

    gatewayQueue.setProcessing({
      userId: msg.userId,
      sessionId,
      messageId: msg.messageId || msg.id,
    });

    console.log('[Gateway] Starting AI processing for:', msg.content);

    try {
      await this.sendThinking(msg.webhook, '正在处理...');

      const defaultModel = configService.getDefaultModel();
      const providerConfig = configService.getModelProvider(defaultModel);
      if (!providerConfig) {
        throw new Error(`Provider not found for model: ${defaultModel}`);
      }
      const provider = new OpenAIProvider({
        apiKey: providerConfig.apiKey,
        baseUrl: providerConfig.baseUrl,
        defaultModel: defaultModel,
      });

      const agent = new ChatAgent({
        provider,
        sessionId,
        memoryService,
      });

      const result = await agent.run(msg.content, {
        onStep: (step: any, iteration: number) => {
          if (step.toolCalls && step.toolCalls.length > 0) {
            for (const tc of step.toolCalls) {
              this.sendToolStart(msg.webhook, tc.name, tc.arguments);
            }
          }
          if (step.results && step.results.length > 0) {
            const observation = step.results[0]?.output || '';
            this.sendToolResult(msg.webhook, observation);
          }
        },
      });

      const answer = (result as any)?.answer || '处理完成';
      this.sendFinalResponse(msg.webhook, answer);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (errorMsg !== 'ABORTED') {
        this.sendToolError(msg.webhook, errorMsg);
        this.sendFinalResponse(msg.webhook, `处理出错: ${errorMsg}`);
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
      console.log('[Gateway] Reusing existing session:', existing, 'for user:', userId);
      return existing;
    }
    console.log('[Gateway] Creating NEW session for user:', userId);
    return this.createNewSession(userId, userName, '');
  }

  private createNewSession(userId: string, userName?: string, webhook?: string): string {
    console.log('[Gateway] createNewSession called for user:', userId, 'webhook:', webhook ? 'yes' : 'no');
    const session = sessionService.create(`DingTalk - ${userName || userId}`);
    this.userSessions.set(userId, session.id);
    
    if (webhook) {
      this.sendToDingTalk(webhook, '已创建新会话，请开始提问。');
    }
    
    return session.id;
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

  private sendToolStart(webhook: string, toolName: string, params: Record<string, any>): void {
    const log = this.formatToolStart(toolName, params);
    this.sendToDingTalk(webhook, log);
  }

  private sendToolResult(webhook: string, result: string): void {
    const truncated = result.length > 500 ? result.substring(0, 500) + '...' : result;
    this.sendToDingTalk(webhook, `[结果] ${truncated}`);
  }

  private sendToolError(webhook: string, error: string): void {
    this.sendToDingTalk(webhook, `[错误] ${error}`);
  }

  private sendThinking(webhook: string, thinking: string): void {
    this.sendToDingTalk(webhook, `[思考] ${thinking}`);
  }

  private sendFinalResponse(webhook: string, content: string): void {
    this.sendToDingTalk(webhook, content);
  }

  private async sendHelp(userName: string, webhook: string): Promise<void> {
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

    this.sendToDingTalk(webhook, helpText);
  }
}

export const gatewayService = new GatewayService();
