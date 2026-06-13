/**
 * CLI 参数解析模块
 * 
 * 本模块负责解析命令行参数，将用户输入的命令转换为程序内部可识别的参数结构
 * 
 * 支持的命令格式：
 * - txcode           -> 默认启动 CLI 聊天模式 (command = 'chat')
 * - txcode chat      -> 显式启动 CLI 聊天模式 (command = 'chat')
 * - txcode web       -> 启动 Web 服务 (command = 'web')
 * - txcode web --port 40001 -> 启动 Web 服务并指定端口
 * - txcode --new     -> 创建新项目 (command = 'new')
 * - txcode new       -> 创建新项目 (command = 'new')
 * 
 * 典型命令行参数示例：
 *   输入: ['node', 'index.ts', 'web', '--port', '40001']
 *   输出: { command: 'web', port: 40001 }
 * 
 *   输入: ['node', 'index.ts']
 *   输出: { command: 'chat', port: 40000 }
 */

export interface Args {
  /** 命令类型：chat(CLI聊天) | web(Web服务) | new(新建项目) */
  command: 'chat' | 'web' | 'new';
  /** Web 服务端口号，默认 40000 */
  port: number;
}

/**
 * 解析命令行参数
 * 
 * 解析逻辑：
 * 1. 获取 argv[2] 作为命令标识符（默认 'chat'）
 * 2. 根据命令类型进行不同的处理：
 *    - 'web': 查找 --port 参数，解析端口号
 *    - '--new' 或 'new': 创建新项目
 *    - 其他: 默认 CLI 模式
 * 
 * @param argv - Node.js process.argv，包含运行时信息
 *               argv[0] = Node.js 可执行文件路径
 *               argv[1] = 当前脚本路径
 *               argv[2] = 用户输入的第一个参数（命令）
 *               argv[3+] = 用户输入的后续参数
 * @returns {Args} 解析后的参数对象，包含命令类型和端口号
 * 
 * @example
 * // 解析 ['node', 'index.ts', 'web', '--port', '40001']
 * // 返回 { command: 'web', port: 40001 }
 */
export function parseArgs(argv: string[]): Args {
  // ========== 获取命令标识符 ==========
  // argv[2] 是用户输入的第一个参数，如 'web', 'chat', '--new' 等
  // 如果没有提供任何参数，默认使用 'chat' 启动 CLI 模式
  const command = argv[2] || 'chat';
  
  // ========== 根据命令类型解析参数 ==========
  if (command === 'web') {
    /**
     * Web 模式处理流程：
     * 1. 在参数数组中查找 '--port' 的索引位置
     * 2. 如果找到 '--port'，读取其下一个参数作为端口号
     * 3. 如果未找到 '--port' 或端口号无效，使用默认端口 40000
     * 
     * 参数解析示例：
     *   ['node', 'index.ts', 'web', '--port', '40001']
     *   -> portIndex = 3, argv[4] = '40001', port = 40001
     *   
     *   ['node', 'index.ts', 'web']
     *   -> portIndex = -1, port = 40000 (默认)
     */
    const portIndex = argv.indexOf('--port');
    const port = portIndex !== -1 && argv[portIndex + 1] 
      ? parseInt(argv[portIndex + 1], 10)  // 解析为十进制整数
      : 40000;  // 默认端口
    
    return { command: 'web', port };
  }
  
  // ========== 新建项目模式 ==========
  // 支持两种写法：'--new' 或 'new'
  if (command === '--new' || command === 'new') {
    return { command: 'new', port: 40000 };
  }
  
  // ========== 默认：CLI 聊天模式 ==========
  // 不指定任何命令参数时，默认启动 CLI 终端界面
  return { command: 'chat', port: 40000 };
}