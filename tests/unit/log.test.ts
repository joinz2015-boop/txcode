/**
 * 分级日志模块测试
 * 
 * 测试内容：
 * 1. LOG_LEVELS 级别映射（debug=10 < info=20 < warning=30 < error=40）
 * 2. setupLogging 级别过滤（isDebugEnabled / isLogEnabled）
 * 3. log.debug/info/warn/error 输出行为
 * 4. warning/error 级别降噪（console.log/console.info 静默）
 */

import { setupLogging, isDebugEnabled, isLogEnabled, log, LOG_LEVELS } from '../../tx_server/src/modules/logger/log';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

describe('分级日志模块', () => {
  const originalLog = console.log;
  const originalInfo = console.info;

  afterEach(() => {
    console.log = originalLog;
    console.info = originalInfo;
  });

  describe('LOG_LEVELS 级别映射', () => {
    test('debug < info < warning < error', () => {
      expect(LOG_LEVELS.debug).toBe(10);
      expect(LOG_LEVELS.info).toBe(20);
      expect(LOG_LEVELS.warning).toBe(30);
      expect(LOG_LEVELS.error).toBe(40);
    });
  });

  describe('setupLogging 级别开关', () => {
    test('debug 级别: isDebugEnabled 与 isLogEnabled 均为 true', () => {
      setupLogging({ logLevel: 'debug' });
      expect(isDebugEnabled()).toBe(true);
      expect(isLogEnabled()).toBe(true);
    });

    test('info 级别: isDebugEnabled 为 false, isLogEnabled 为 true', () => {
      setupLogging({ logLevel: 'info' });
      expect(isDebugEnabled()).toBe(false);
      expect(isLogEnabled()).toBe(true);
    });

    test('warning 级别: 两者均为 false（关闭 Agent 循环日志）', () => {
      setupLogging({ logLevel: 'warning' });
      expect(isDebugEnabled()).toBe(false);
      expect(isLogEnabled()).toBe(false);
    });

    test('error 级别: 两者均为 false', () => {
      setupLogging({ logLevel: 'error' });
      expect(isDebugEnabled()).toBe(false);
      expect(isLogEnabled()).toBe(false);
    });
  });

  describe('log 输出级别过滤', () => {
    test('debug 级别输出 debug 日志, 格式含 [DEBUG] [模块名]', () => {
      setupLogging({ logLevel: 'debug' });
      const spy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
      log.debug('TestModule', 'hello world');
      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining('[DEBUG] [TestModule] hello world')
      );
      spy.mockRestore();
    });

    test('info 级别不输出 debug 日志, 但输出 info 日志', () => {
      setupLogging({ logLevel: 'info' });
      const spy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
      log.debug('TestModule', 'hidden debug');
      expect(spy).not.toHaveBeenCalled();
      log.info('TestModule', 'visible info');
      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining('[INFO] [TestModule] visible info')
      );
      spy.mockRestore();
    });

    test('warning 级别不输出 info/debug, 输出 warn', () => {
      setupLogging({ logLevel: 'warning' });
      const spy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
      log.debug('TestModule', 'hidden debug');
      log.info('TestModule', 'hidden info');
      expect(spy).not.toHaveBeenCalled();
      log.warn('TestModule', 'visible warn');
      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining('[WARNING] [TestModule] visible warn')
      );
      spy.mockRestore();
    });

    test('error 级别只输出 error 且走 stderr', () => {
      setupLogging({ logLevel: 'error' });
      const stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
      const stderrSpy = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
      log.warn('TestModule', 'hidden warn');
      expect(stdoutSpy).not.toHaveBeenCalled();
      log.error('TestModule', 'visible error');
      expect(stderrSpy).toHaveBeenCalledWith(
        expect.stringContaining('[ERROR] [TestModule] visible error')
      );
      stdoutSpy.mockRestore();
      stderrSpy.mockRestore();
    });

    test('args 追加参数以 JSON 序列化输出', () => {
      setupLogging({ logLevel: 'debug' });
      const spy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
      log.debug('TestModule', 'with args', { count: 3 });
      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining('with args {"count":3}')
      );
      spy.mockRestore();
    });
  });

  describe('warning/error 降噪', () => {
    test('warning 级别静默 console.log / console.info', () => {
      const logs: string[] = [];
      console.log = (msg?: any) => { logs.push(String(msg)); };
      console.info = (msg?: any) => { logs.push(String(msg)); };
      setupLogging({ logLevel: 'warning' });
      console.log('silenced log');
      console.info('silenced info');
      expect(logs).toEqual([]);
    });

    test('debug/info 级别恢复 console.log / console.info', () => {
      const logs: string[] = [];
      console.log = (msg?: any) => { logs.push(String(msg)); };
      console.info = (msg?: any) => { logs.push(String(msg)); };
      setupLogging({ logLevel: 'warning' });
      console.log('silenced');
      expect(logs).toEqual([]);

      setupLogging({ logLevel: 'info' });
      // 恢复的是模块加载时的原始 console，不再走测试注入的收集器
      console.log('restored');
      expect(logs).toEqual([]);
    });
  });

  describe('log 文件写入', () => {
    test('指定 logFile 时写入文件（UTF-8 追加）', () => {
      const logFilePath = path.join(os.tmpdir(), `txcode-log-test-${Date.now()}.log`);
      try {
        setupLogging({ logLevel: 'debug', logFile: logFilePath });
        log.debug('TestModule', 'file content');
        const content = fs.readFileSync(logFilePath, 'utf-8');
        expect(content).toContain('[DEBUG] [TestModule] file content');
      } finally {
        setupLogging({ logLevel: 'info' });
        if (fs.existsSync(logFilePath)) {
          fs.unlinkSync(logFilePath);
        }
      }
    });
  });
});
