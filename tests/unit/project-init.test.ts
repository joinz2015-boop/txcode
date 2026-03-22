/**
 * 项目初始化测试
 * 
 * 测试内容：
 * 1. 目录结构是否正确
 * 2. 入口文件是否可执行
 * 3. 基础模块是否可导入
 */

import { parseArgs } from '../../src/cli/args';

describe('项目初始化', () => {
  describe('命令行参数解析', () => {
    test('默认应该返回 chat 模式', () => {
      const result = parseArgs(['node', 'txcode']);
      expect(result.command).toBe('chat');
    });

    test('web 命令应该返回 web 模式', () => {
      const result = parseArgs(['node', 'txcode', 'web']);
      expect(result.command).toBe('web');
    });

    test('--new 应该返回 new 模式', () => {
      const result = parseArgs(['node', 'txcode', '--new']);
      expect(result.command).toBe('new');
    });

    test('web 模式应该解析端口号', () => {
      const result = parseArgs(['node', 'txcode', 'web', '--port', '3000']);
      expect(result.command).toBe('web');
      expect(result.port).toBe(3000);
    });

    test('web 模式应该使用默认端口 40000', () => {
      const result = parseArgs(['node', 'txcode', 'web']);
      expect(result.port).toBe(40000);
    });
  });
});