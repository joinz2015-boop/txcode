/**
 * CLI 类型定义
 */

export interface CLIState {
  mode: 'chat' | 'command';
  input: string;
  messages: MessageItem[];
  status: 'idle' | 'thinking' | 'executing';
  error?: string;
}

export interface MessageItem {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: Date;
}

export interface CommandResult {
  success: boolean;
  message?: string;
  data?: any;
}