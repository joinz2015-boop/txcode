export interface AiCallLogRow {
  id: number;
  model_address: string;
  model_name: string;
  request_time: string;
  response_time: string | null;
  duration_ms: number;
  input_tokens: number;
  output_tokens: number;
  cost: number;
  call_type: string;
  session_id: string | null;
  created_at: string;
}

export interface AiCallLog {
  model_address: string;
  model_name: string;
  request_time: Date;
  response_time?: Date;
  duration_ms: number;
  input_tokens: number;
  output_tokens: number;
  cost: number;
  call_type: 'tool_call' | 'normal';
  session_id?: string;
}
