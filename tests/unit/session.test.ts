/**
 * Session 模块测试
 */

import { DbService } from '../../src/modules/db/db.service';
import { SessionService } from '../../src/modules/session/session.service';

describe('Session 模块', () => {
  let dbService: DbService;
  let sessionService: SessionService;

  beforeEach(async () => {
    dbService = new DbService(':memory:');
    await dbService.init();
    sessionService = new SessionService(dbService);
  });

  afterEach(() => {
    dbService.close();
  });

  describe('CRUD 操作', () => {
    test('create() 应该创建会话', () => {
      const session = sessionService.create('测试会话');
      expect(session.id).toBeDefined();
      expect(session.title).toBe('测试会话');
    });

    test('create() 应该支持项目路径', () => {
      const session = sessionService.create('测试会话', '/path/to/project');
      expect(session.projectPath).toBe('/path/to/project');
    });

    test('get() 应该返回会话', () => {
      const created = sessionService.create('测试');
      const session = sessionService.get(created.id);
      expect(session?.title).toBe('测试');
    });

    test('get() 不存在的会话应该返回 undefined', () => {
      const session = sessionService.get('non-existent');
      expect(session).toBeUndefined();
    });

    test('getAll() 应该返回所有会话', () => {
      sessionService.create('会话1');
      sessionService.create('会话2');
      const sessions = sessionService.getAll();
      expect(sessions).toHaveLength(2);
    });

    test('update() 应该更新会话', () => {
      const session = sessionService.create('旧标题');
      sessionService.update(session.id, { title: '新标题' });
      const updated = sessionService.get(session.id);
      expect(updated?.title).toBe('新标题');
    });

    test('delete() 应该删除会话', () => {
      const session = sessionService.create('待删除');
      sessionService.delete(session.id);
      expect(sessionService.get(session.id)).toBeUndefined();
    });
  });

  describe('会话切换', () => {
    test('switchTo() 应该切换当前会话', () => {
      const session = sessionService.create('测试会话');
      const switched = sessionService.switchTo(session.id);
      expect(switched?.id).toBe(session.id);
      expect(sessionService.getCurrentId()).toBe(session.id);
    });

    test('switchTo() 不存在的会话应该返回 undefined', () => {
      const result = sessionService.switchTo('non-existent');
      expect(result).toBeUndefined();
    });

    test('getCurrent() 应该返回当前会话', () => {
      const session = sessionService.create('测试');
      sessionService.switchTo(session.id);
      expect(sessionService.getCurrent()?.id).toBe(session.id);
    });

    test('clearCurrent() 应该清除当前会话', () => {
      const session = sessionService.create('测试');
      sessionService.switchTo(session.id);
      sessionService.clearCurrent();
      expect(sessionService.getCurrentId()).toBeNull();
    });
  });

  describe('搜索和列表', () => {
    test('getRecent() 应该返回最近的会话', () => {
      sessionService.create('会话1');
      sessionService.create('会话2');
      sessionService.create('会话3');
      const recent = sessionService.getRecent(2);
      expect(recent).toHaveLength(2);
    });

    test('search() 应该搜索会话', () => {
      sessionService.create('Python项目');
      sessionService.create('Node项目');
      sessionService.create('其他');
      const results = sessionService.search('项目');
      expect(results).toHaveLength(2);
    });
  });

  describe('项目路径相关', () => {
    test('getOrCreateByPath() 应该返回已存在的会话', () => {
      const created = sessionService.create('测试', '/path/to/project');
      const found = sessionService.getOrCreateByPath('/path/to/project');
      expect(found.id).toBe(created.id);
    });

    test('getOrCreateByPath() 应该创建新会话', () => {
      const session = sessionService.getOrCreateByPath('/new/project');
      expect(session.projectPath).toBe('/new/project');
    });
  });
});