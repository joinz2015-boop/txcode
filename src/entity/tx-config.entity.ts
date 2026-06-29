export interface ContextConfig {
  mode: 'fixed' | 'percentage';
  maxTokens: number;
  percentage: number;
  autoCompact: boolean;
}

export interface TxConfig {
  debug: boolean;
  
  log: {
    enabled: boolean;
    dir: string;
    accessLog: string;
  };
  
  maxToolIterations: number;
  
  ai: {
    context: ContextConfig;
  };

  songbing: {
    platformUrl: string;
  };

  txcodeHub: string;
}
