import { DingtalkMessage, MessageHandler, DingtalkAdapter, DingtalkAdapterConfig, DingtalkReplyData } from '../gateway.types.js';

export class DingtalkStreamAdapter implements DingtalkAdapter {
  private client: any = null;
  private handler: MessageHandler | null = null;
  private running: boolean = false;
  private currentMessageId: string | null = null;

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
        
        this.currentMessageId = res.headers?.messageId || null;
        console.log('[DingTalk] messageId:', this.currentMessageId);

        if (!this.handler) {
          return { status: EventAck.SUCCESS };
        }

        try {
          const body = JSON.parse(res.data);
          const message = this.parseMessage(body);
          
          console.log('[DingTalk] 解析后的消息:', JSON.stringify(message));
          
          if (message) {
            await this.handler(message);
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

  sendReply(content: string): void {
    if (!this.client || !this.currentMessageId) {
      console.error('[DingTalk] sendReply failed: no client or messageId');
      return;
    }

    try {
      const replyData: DingtalkReplyData = {
        msgType: 'text',
        text: { content },
      };
      
      console.log('[DingTalk] Sending reply via send, messageId:', this.currentMessageId);
      this.client.send(this.currentMessageId, replyData);
    } catch (error) {
      console.error('[DingTalk] sendReply failed:', error);
    }
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
