/**
 * TxCode 全局配置文件
 * 此文件定义了 TxCode 项目的全局配置接口和默认配置
 * 主要用于控制应用程序的基本行为，如调试模式和日志记录
 */

export interface TxConfig {
  /**
   * 调试模式开关
   * - true: 启用调试模式，会输出更多调试信息
   * - false: 关闭调试模式，仅输出必要信息
   */
  debug: boolean;
  
  /**
   * 日志配置
   */
  log: {
    /**
     * 日志记录开关
     * - true: 启用日志记录
     * - false: 关闭日志记录
     */
    enabled: boolean;
    
    /**
     * 日志文件存储目录
     * 相对路径，相对于项目根目录
     */
    dir: string;
    
    /**
     * 访问日志文件名
     * 记录所有访问请求的日志文件
     */
    accessLog: string;
  };
}

/**
 * TxCode 默认配置
 * 这是应用程序的默认配置，可以在运行时通过其他方式覆盖
 */
const config: TxConfig = {
  // 默认启用调试模式，便于开发和问题排查
  debug: true,
  
  // 日志配置
  log: {
    // 默认启用日志记录
    enabled: true,
    
    // 日志文件存储在项目根目录下的 'log' 文件夹中
    dir: 'log',
    
    // 访问日志文件名为 'access.log'
    accessLog: 'access.log',
  },
};

export default config;
