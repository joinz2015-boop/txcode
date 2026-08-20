export interface ProviderRow {
  id: string;
  name: string;
  api_key: string;
  base_url: string;
  enabled: number;
  is_default: number;
  created_at: string;
  updated_at: string;
}

export interface Provider {
  id: string;
  name: string;
  apiKey: string;
  baseUrl: string;
  enabled: boolean;
  isDefault: boolean;
}

export interface ProviderInput {
  id?: string;
  name: string;
  apiKey: string;
  baseUrl?: string;
  enabled?: boolean;
  isDefault?: boolean;
}
