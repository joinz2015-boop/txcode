export interface GatewayConfig {
  dingtalk: import('../../entity/gateway.entity.js').DingtalkConfig;
}

export interface ProcessingSession {
  userId: string;
  sessionId: string;
  messageId: string;
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

export type MessageHandler = (message: import('../../services/gateway/gateway.types.js').DingtalkMessage) => Promise<void>;

export interface DingtalkAdapter {
  start(config: DingtalkAdapterConfig): Promise<void>;
  stop(): Promise<void>;
  isRunning(): boolean;
  registerHandler(callback: MessageHandler): void;
}
