/**
 * DB 模块单元测试
 * 
 * 测试内容：
 * 1. 数据库初始化
 * 2. CRUD 操作
 * 3. 事务执行
 */

import type { Database } from 'sql.js';
import * as fs from 'fs';
import * as path from 'path';
import { DbService } from '../../src/modules/db/db.service';

describe('DB 模块', () => {
  let dbService: DbService;
  const testDbPath = path.join(__dirname, `test-${Date.now()}.db`);

  beforeEach(async () => {
    dbService = new DbService(testDbPath);
    await dbService.init();
  });

  afterEach(async () => {
    dbService.close();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('init()', () => {
    test('应该成功初始化数据库', () => {
      expect(dbService.getDb()).toBeTruthy();
    });

    test('应该创建迁移表', async () => {
      const result = dbService.get<{name: string}>(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='migrations'"
      );
      expect(result).toBeDefined();
    });
  });

  describe('CRUD 操作', () => {
    test('run() 应该执行 INSERT 并返回结果', () => {
      dbService.run('CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)');
      const result = dbService.run('INSERT INTO test (name) VALUES (?)', ['test']);
      
      expect(result.changes).toBe(1);
      expect(result.lastInsertRowid).toBe(1);
    });

    test('get() 应该返回单条记录', () => {
      dbService.run('CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)');
      dbService.run('INSERT INTO test (name) VALUES (?)', ['test']);
      
      const result = dbService.get<{id: number; name: string}>(
        'SELECT * FROM test WHERE name = ?',
        ['test']
      );
      
      expect(result).toEqual({ id: 1, name: 'test' });
    });

    test('get() 查询不存在的记录应返回 undefined', () => {
      dbService.run('CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)');
      
      const result = dbService.get('SELECT * FROM test WHERE id = ?', [999]);
      expect(result).toBeUndefined();
    });

    test('all() 应该返回多条记录', () => {
      dbService.run('CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)');
      dbService.run('INSERT INTO test (name) VALUES (?)', ['a']);
      dbService.run('INSERT INTO test (name) VALUES (?)', ['b']);
      
      const results = dbService.all<{id: number; name: string}>('SELECT * FROM test');
      
      expect(results).toHaveLength(2);
      expect(results[0].name).toBe('a');
      expect(results[1].name).toBe('b');
    });
  });

  describe('transaction()', () => {
    test('应该正确执行事务', () => {
      dbService.run('CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)');
      
      const result = dbService.transaction(() => {
        dbService.run('INSERT INTO test (name) VALUES (?)', ['t1']);
        dbService.run('INSERT INTO test (name) VALUES (?)', ['t2']);
        return 'success';
      });
      
      expect(result).toBe('success');
      
      const count = dbService.get<{count: number}>('SELECT COUNT(*) as count FROM test');
      expect(count?.count).toBe(2);
    });

    test('事务回滚应该生效', () => {
      dbService.run('CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)');
      
      try {
        dbService.transaction(() => {
          dbService.run('INSERT INTO test (name) VALUES (?)', ['t1']);
          throw new Error('手动回滚');
        });
      } catch {
        // 预期内的错误
      }
      
      const count = dbService.get<{count: number}>('SELECT COUNT(*) as count FROM test');
      expect(count?.count).toBe(0);
    });
  });
});
