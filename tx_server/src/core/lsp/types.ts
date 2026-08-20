/**
 * LSP 类型定义
 */

export interface LSPServerInfo {
  id: string;
  name: string;
  extensions: string[];
  downloadUrl?: string;
  downloadType?: "npm" | "github" | "go" | "gem" | "dotnet" | "bun";
  installCommand?: string[];
  binaryName: string;
  rootMarkers: string[];
  requiresJava?: boolean;
  minJavaVersion?: number;
  requiresSystemBinary?: boolean;
  defaultArgs?: string[];
}

export interface LSPConfig {
  enabled: boolean;
  autoStart: boolean;
}

export interface ServerStatus {
  status: LSPServerStatus;
  error?: string;
  version?: number;
}

export enum LSPServerStatus {
  Stopped = "stopped",
  Running = "running",
  Downloading = "downloading",
  DownloadFailed = "download_failed",
  NotFound = "not_found",
  VersionError = "version_error",
}

export interface LSPClient {
  serverId: string;
  connection: any;
  processes: any[];
  documentUri?: string;
}

export interface LSPServerRecord {
  id: string;
  enabled: number;
  auto_start: number;
  created_at: number;
  updated_at: number;
}

export interface JavaVersionCheck {
  valid: boolean;
  version?: number;
  error?: string;
}

export interface DownloadProgress {
  serverId: string;
  progress: number;
  message: string;
}
