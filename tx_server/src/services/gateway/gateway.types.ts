import type { DingtalkConfig } from '../../entity/gateway.entity.js';

export interface DingtalkMessage {
  conversationId?: string;
  chatbotCorpId?: string;
  chatbotMessageId?: string;
  msgId?: string;
  senderNick?: string;
  isAdmin?: boolean;
  senderStaffId?: string;
  sessionWebhookExpiredTime?: number;
  createAt?: number;
  senderCorpId?: string;
  conversationType?: string;
  senderId?: string;
  sessionWebhook?: string;
  chatBotId?: string;
  robotCode?: string;
  msgType?: string;
  text?: { content: string };
  sessionId?: string;
}

export interface QueuedMessage {
  id: string;
  userId: string;
  userName?: string;
  content: string;
  sessionId?: string;
  webhook: string;
  messageId?: string;
  timestamp: number;
}

export interface GatewayStatus {
  running: boolean;
  connectedAt?: number;
  config: DingtalkConfig;
}
