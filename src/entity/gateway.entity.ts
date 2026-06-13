export interface WafGatewayConfigRow {
  id: number;
  secret_key: string;
  server_ip: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface WafGatewayConfig {
  id: number;
  secret_key: string;
  server_ip: string;
  status: 'running' | 'stopped';
  created_at: string;
  updated_at: string;
}
