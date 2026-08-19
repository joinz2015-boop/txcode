export interface ContextConfig {
  mode: 'fixed' | 'percentage';
  /** @deprecated 已改为从数据库 config 表读取（ai.context.maxTokens），此处仅保留默认值兜底 */
  maxTokens: number;
  percentage: number;
  autoCompact: boolean;
}

export interface TxConfig {
  debug: boolean;
  
  log: {
    /** @deprecated 已改为从数据库 config 表读取（log.enabled），此处仅保留默认值兜底 */
    enabled: boolean;
    dir: string;
    accessLog: string;
  };
  
  /** @deprecated 已改为从数据库 config 表读取（ai.maxIterations），此处仅保留默认值兜底 */
  maxToolIterations: number;
  
  ai: {
    context: ContextConfig;
  };

  songbing: {
    platformUrl: string;
  };

  txcodeHub: string;
}
