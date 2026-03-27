export interface DingtalkConfig {
  enabled: boolean;
  clientId: string;
  clientSecret: string;
  botName?: string;
}

export interface GatewayConfig {
  dingtalk: DingtalkConfig;
}

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
  messageId?: string;
  timestamp: number;
}

export interface ProcessingSession {
  userId: string;
  sessionId: string;
  messageId: string;
}

export interface GatewayStatus {
  running: boolean;
  connectedAt?: number;
  config: DingtalkConfig;
}

export interface QueueStatus {
  queued: number;
  processing: number;
}

export type ToolLogType = 'tool_start' | 'tool_result' | 'tool_error' | 'ai_thinking' | 'final';

export interface ToolLog {
  type: ToolLogType;
  toolName?: string;
  params?: Record<string, any>;
  result?: string;
  error?: string;
  thinking?: string;
  content?: string;
}

export interface DingtalkAdapterConfig {
  clientId: string;
  clientSecret: string;
}

export interface DingtalkReplyData {
  msgType: string;
  text: { content: string };
}

export type MessageHandler = (message: DingtalkMessage) => Promise<void>;

export interface DingtalkAdapter {
  start(config: DingtalkAdapterConfig): Promise<void>;
  stop(): Promise<void>;
  isRunning(): boolean;
  registerHandler(callback: MessageHandler): void;
}
