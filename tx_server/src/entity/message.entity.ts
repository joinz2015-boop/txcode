export interface MessageRow {
  id: number;
  session_id: string;
  role: string;
  content: string;
  keep_context: number;
  is_original: number;
  created_at: string;
}

export interface Message {
  id: number;
  sessionId: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  keepContext: boolean;
  isOriginal: boolean;
  createdAt: string;
}
