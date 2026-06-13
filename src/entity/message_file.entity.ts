export interface MessageFileRow {
  id: number;
  message_id: number;
  session_id: string;
  file_path: string;
  file_type: string;
  created_at: string;
}

export interface MessageFile {
  id: number;
  messageId: number;
  sessionId: string;
  filePath: string;
  fileType: string;
  createdAt: string;
}
