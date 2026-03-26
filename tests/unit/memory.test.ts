/**
 * Memory 模块测试
 */

import { DbService } from '../../src/modules/db/db.service';
import { SessionService } from '../../src/modules/session/session.service';
import { MemoryService } from '../../src/modules/memory/memory.service';

describe('Memory 模块', () => {
  let dbService: DbService;
  let sessionService: SessionService;
  let memoryService: MemoryService;
  let sessionId: string;

  beforeEach(async () => {
    dbService = new DbService(':memory:');
    await dbService.init();
    sessionService = new SessionService(dbService);
    memoryService = new MemoryService(dbService);
    const session = sessionService.create('test-session');
    sessionId = session.id;
  });

  afterEach(() => {
    dbService.close();
  });

  describe('消息管理', () => {
    test('addMessage() 应该添加消息', () => {
      memoryService.addMessage(sessionId, 'user', 'Hello', true);
      const messages = memoryService.getAllMessages(sessionId);
      expect(messages).toHaveLength(1);
      expect(messages[0].content).toBe('Hello');
    });

    test('永久消息和临时消息应该正确分离', () => {
      memoryService.addMessage(sessionId, 'user', 'user msg', true);
      memoryService.addMessage(sessionId, 'tool', 'tool result', false);

      const permanent = memoryService.getPermanentMessages(sessionId);
      expect(permanent).toHaveLength(1);
      expect(permanent[0].content).toBe('user msg');

      const temporary = memoryService.getTemporaryMessages(sessionId);
      expect(temporary).toHaveLength(1);
      expect(temporary[0].content).toBe('tool result');
    });

    test('deleteMessage() 应该删除消息', () => {
      memoryService.addMessage(sessionId, 'user', 'Hello', true);
      const messages = memoryService.getAllMessages(sessionId);
      memoryService.deleteMessage(messages[0].id);
      expect(memoryService.getAllMessages(sessionId)).toHaveLength(0);
    });
  });

  describe('会话压缩', () => {
    test('compressSession() 应该将消息数量限制为 keepCount', async () => {
      for (let i = 0; i < 10; i++) {
        memoryService.addMessage(sessionId, 'user', `msg ${i}`, true);
        await new Promise(r => setTimeout(r, 15));
      }

      memoryService.compressSession(sessionId, 5);

      const messages = memoryService.getPermanentMessages(sessionId);
      expect(messages).toHaveLength(5);
    });
  });
});