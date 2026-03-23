/**
 * TxCode 全局配置文件
 * 此文件定义了 TxCode 项目的全局配置接口和默认配置
 * 主要用于控制应用程序的基本行为，如调试模式和日志记录
 */

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
    maxContextTokens: number;
    context: ContextConfig;
  };
}

/**
 * TxCode 默认配置
 * 这是应用程序的默认配置，可以在运行时通过其他方式覆盖
 */
const config: TxConfig = {
  debug: true,
  
  log: {
    enabled: true,
    dir: 'log',
    accessLog: 'access.log',
  },
  
  maxToolIterations: 50,
  
  ai: {
    maxContextTokens: 100000,
    context: {
      mode: 'fixed',
      maxTokens: 100000,
      percentage: 0.95,
      autoCompact: true,
    },
  },
};

export default config;
