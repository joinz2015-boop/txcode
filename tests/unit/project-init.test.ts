/**
 * 项目初始化测试
 * 
 * 测试内容：
 * 1. 精简参数解析（tx_server/src/args.ts）
 * 2. 默认 Web 模式启动参数
 * 3. --port / --version / --help / --log-level / desktop 参数解析
 */

import { parseArgs, readVersion, helpText } from '../../tx_server/src/args';

describe('项目初始化', () => {
  describe('命令行参数解析', () => {
    test('默认无参数应该返回 web 模式, 端口 40000, 日志 info', () => {
      const result = parseArgs(['node', 'txcode']);
      expect(result.command).toBe('web');
      expect(result.port).toBe(40000);
      expect(result.logLevel).toBe('info');
      expect(result.showVersion).toBe(false);
      expect(result.showHelp).toBe(false);
      expect(result.noBrowser).toBe(false);
    });

    test('--port 应该解析指定端口', () => {
      const result = parseArgs(['node', 'txcode', '--port', '40001']);
      expect(result.command).toBe('web');
      expect(result.port).toBe(40001);
    });

    test('-p 短参数应该解析指定端口', () => {
      const result = parseArgs(['node', 'txcode', '-p', '41000']);
      expect(result.port).toBe(41000);
    });

    test('--version 应该设置 showVersion', () => {
      const result = parseArgs(['node', 'txcode', '--version']);
      expect(result.showVersion).toBe(true);
    });

    test('-v 短参数应该设置 showVersion', () => {
      const result = parseArgs(['node', 'txcode', '-v']);
      expect(result.showVersion).toBe(true);
    });

    test('--help 应该设置 showHelp', () => {
      const result = parseArgs(['node', 'txcode', '--help']);
      expect(result.showHelp).toBe(true);
    });

    test('-h 短参数应该设置 showHelp', () => {
      const result = parseArgs(['node', 'txcode', '-h']);
      expect(result.showHelp).toBe(true);
    });

    test('--log-level debug 应该解析日志级别', () => {
      const result = parseArgs(['node', 'txcode', '--log-level', 'debug']);
      expect(result.logLevel).toBe('debug');
    });

    test('--log-level=debug 等号写法应该解析日志级别', () => {
      const result = parseArgs(['node', 'txcode', '--log-level=debug']);
      expect(result.logLevel).toBe('debug');
    });

    test('--log-level 非法值应该回退到默认 info', () => {
      const result = parseArgs(['node', 'txcode', '--log-level', 'verbose']);
      expect(result.logLevel).toBe('info');
    });

    test('--log-file 应该解析日志文件路径', () => {
      const result = parseArgs(['node', 'txcode', '--log-level', 'debug', '--log-file', 'server.log']);
      expect(result.logLevel).toBe('debug');
      expect(result.logFile).toBe('server.log');
    });

    test('desktop 参数应该设置 noBrowser', () => {
      const result = parseArgs(['node', 'txcode', 'desktop', '--port', '41000']);
      expect(result.command).toBe('desktop');
      expect(result.noBrowser).toBe(true);
      expect(result.port).toBe(41000);
    });

    test('readVersion 应该读取 package.json 版本号', () => {
      const version = readVersion();
      expect(version).toMatch(/^\d+\.\d+\.\d+$/);
    });

    test('helpText 应该包含关键选项', () => {
      expect(helpText).toContain('txcode - AI Coding Assistant');
      expect(helpText).toContain('--port');
      expect(helpText).toContain('--log-level');
      expect(helpText).toContain('--version');
      expect(helpText).toContain('--help');
      expect(helpText).toContain('--log-file');
    });
  });
});
