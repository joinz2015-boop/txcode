import { DingtalkMessage, MessageHandler, DingtalkAdapter, DingtalkAdapterConfig } from '../gateway.types.js';

export class DingtalkStreamAdapter implements DingtalkAdapter {
  private client: any = null;
  private handler: MessageHandler | null = null;
  private running: boolean = false;

  async start(config: DingtalkAdapterConfig): Promise<void> {
    if (this.running) {
      return;
    }

    try {
      const { DWClient, TOPIC_ROBOT, EventAck } = await import('dingtalk-stream-sdk-nodejs');
      
      this.client = new DWClient({
        clientId: config.clientId,
        clientSecret: config.clientSecret,
      });
      this.client.debug = true;

      this.client.registerCallbackListener(TOPIC_ROBOT, async (res: any) => {
        console.log('[DingTalk] 收到机器人消息:', res.data?.substring?.(0, 200) || res.data);
        
        const messageId = res.headers?.messageId || null;
        console.log('[DingTalk] messageId:', messageId);

        if (!this.handler) {
          return { status: EventAck.SUCCESS };
        }

        try {
          const body = JSON.parse(res.data);
          const message = this.parseMessage(body);
          
          console.log('[DingTalk] 解析后的消息:', JSON.stringify(message));
          
          if (message && body.sessionWebhook) {
            const sessionWebhook = body.sessionWebhook;
            
            setTimeout(async () => {
              try {
                await this.handler!(message);
              } catch (e) {
                console.error('[DingTalk] handler error:', e);
              }
            }, 0);

            if (messageId) {
              try {
                console.log('[DingTalk] Sending immediate ack for messageId:', messageId);
                this.client.send(messageId, { status: EventAck.SUCCESS });
              } catch (e) {
                console.error('[DingTalk] ack failed:', e);
              }
            }
          }
        } catch (e) {
          console.error('[DingTalk] 解析消息失败:', e);
        }

        return { status: EventAck.SUCCESS };
      });

      this.client.connect();
      this.running = true;
    } catch (error) {
      this.running = false;
      console.error('[DingTalk] 启动失败:', error);
      throw new Error(`Failed to start DingTalk adapter: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async stop(): Promise<void> {
    if (this.client && this.running) {
      try {
        this.client.disconnect();
      } catch (error) {
        console.error('[DingTalk] 停止失败:', error);
      }
      this.client = null;
      this.running = false;
    }
  }

  isRunning(): boolean {
    return this.running;
  }

  registerHandler(callback: MessageHandler): void {
    this.handler = callback;
  }

  async sendReply(content: string): Promise<void> {
    // sendReply is no longer used - we send replies directly via sessionWebhook in handleMessage
  }

  private async getAccessToken(): Promise<string> {
    const GET_TOKEN_URL = 'https://api.dingtalk.com/gettoken';
    const response = await fetch(`${GET_TOKEN_URL}?appkey=${this.client.config.clientId}&appsecret=${this.client.config.clientSecret}`);
    const data = await response.json() as { access_token?: string };
    if (data.access_token) {
      return data.access_token;
    }
    throw new Error('Failed to get access token');
  }

  private parseMessage(body: any): DingtalkMessage | null {
    if (!body) {
      return null;
    }

    const msgType = body.msgType || body.msgtype;
    
    if (msgType === 'text') {
      return {
        conversationId: body.conversationId,
        chatbotCorpId: body.chatbotCorpId,
        chatbotMessageId: body.chatbotMessageId,
        msgId: body.msgId,
        senderNick: body.senderNick,
        isAdmin: body.isAdmin,
        senderStaffId: body.senderStaffId,
        sessionWebhookExpiredTime: body.sessionWebhookExpiredTime,
        createAt: body.createAt,
        senderCorpId: body.senderCorpId,
        conversationType: body.conversationType,
        senderId: body.senderId,
        sessionWebhook: body.sessionWebhook,
        chatBotId: body.chatBotId,
        robotCode: body.robotCode,
        msgType: body.msgType,
        text: body.text,
        sessionId: body.sessionId,
      };
    }

    return null;
  }
}

export const dingtalkAdapter = new DingtalkStreamAdapter();
