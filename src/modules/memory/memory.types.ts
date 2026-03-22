/**
 * Memory 模块类型定义
 */

export interface Message {
  id: number;
  sessionId: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  isPermanent: boolean;
  createdAt: string;
}