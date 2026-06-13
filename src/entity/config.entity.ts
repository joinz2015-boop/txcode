export interface ConfigRow {
  key: string;
  value: string;
  updated_at: string;
}

export interface ProxyRow {
  id: number;
  enabled: number;
  type: string;
  host: string;
  port: number;
  updated_at: string;
}

export interface DingTalkRow {
  id: number;
  enabled: number;
  client_id: string;
  client_secret: string;
  bot_name: string;
}

export interface ProxyConfig {
  enabled: boolean;
  type: 'http' | 'socks5';
  host: string;
  port: number;
}
