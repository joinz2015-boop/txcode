export interface SummarizerResult {
  success: boolean;
  summary: string;
  reasoning?: string;
  tokensBefore: number;
  tokensAfter: number;
  error?: string;
}

export interface SummarizerOptions {
  sessionId: string;
  onProgress?: (message: string) => void;
}

export interface CompactionCheckResult {
  needed: boolean;
  reason: string;
  promptTokens: number;
  threshold: number;
}
