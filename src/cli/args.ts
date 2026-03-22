/**
 * CLI 参数解析
 * 
 * 解析命令行参数，支持以下模式：
 * - txcode: 启动 CLI 聊天模式
 * - txcode web: 启动 Web 服务
 * - txcode --new: 创建新项目
 */

export interface Args {
  command: 'chat' | 'web' | 'new';
  port: number;
}

/**
 * 解析命令行参数
 * 
 * @param argv - 命令行参数数组
 * @returns 解析后的参数对象
 */
export function parseArgs(argv: string[]): Args {
  const command = argv[2] || 'chat';
  
  if (command === 'web') {
    // 查找 --port 参数
    const portIndex = argv.indexOf('--port');
    const port = portIndex !== -1 && argv[portIndex + 1] 
      ? parseInt(argv[portIndex + 1], 10) 
      : 40000;
    
    return { command: 'web', port };
  }
  
  if (command === '--new' || command === 'new') {
    return { command: 'new', port: 40000 };
  }
  
  return { command: 'chat', port: 40000 };
}