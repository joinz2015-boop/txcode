export interface SpecMetadata {
  name: string;
  description: string;
  read_mode: 'required' | 'optional';
}

export interface Spec {
  name: string;
  description: string;
  read_mode: 'required' | 'optional';
  content: string;
  rawContent: string;
  filePath: string;
}

export interface SpecRepository {
  id: string;
  name: string;
  url: string;
  type: 'default' | 'custom';
  enabled: number;
  repo_path: string | null;
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SpecRepositoryInput {
  name: string;
  url: string;
  type?: 'default' | 'custom';
  repo_path?: string;
}
