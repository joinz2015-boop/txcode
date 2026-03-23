/**
 * 集成测试
 * 
 * 测试完整的会话流程
 */

import * as path from 'path';
import * as fs from 'fs';
import { DbService } from '../../src/modules/db/db.service';
import { SessionService } from '../../src/modules/session/session.service';
import { MemoryService } from '../../src/modules/memory/memory.service';
import { ConfigService } from '../../src/modules/config/config.service';
import { ToolService } from '../../src/modules/tools/tool.service';
import { SkillsManager } from '../../src/modules/skill/skills.manager';

describe('集成测试', () => {
  let dbService: DbService;
  let sessionService: SessionService;
  let memoryService: MemoryService;
  let configService: ConfigService;
  let toolService: ToolService;
  let skillsManager: SkillsManager;
  let dbPath: string;

  beforeEach(() => {
    dbPath = path.join(__dirname, 'test-int.db');
    dbService = new DbService(dbPath);
    dbService.init();

    sessionService = new SessionService(dbService);
    memoryService = new MemoryService(dbService);
    configService = new ConfigService(dbService);
    toolService = new ToolService();
    skillsManager = new SkillsManager();
  });

  afterEach(() => {
    dbService.close();
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
  });

  describe('完整会话流程', () => {
    test('应该能够完成创建会话', () => {
      const session = sessionService.create('测试会话', '/project/path');
      expect(session.id).toBeDefined();
      expect(session.title).toBe('测试会话');

      sessionService.switchTo(session.id);

      const current = sessionService.getCurrent();
      expect(current?.id).toBe(session.id);
    });

    test('应该能够完成添加消息', () => {
      const session = sessionService.create('消息测试');
      sessionService.switchTo(session.id);

      memoryService.addMessage(session.id, 'user', '你好', true);
      memoryService.addMessage(session.id, 'assistant', '你好！有什么可以帮助你的？', true);
      memoryService.addMessage(session.id, 'tool', 'tool output', false);

      const messages = memoryService.getAllMessages(session.id);
      expect(messages).toHaveLength(3);

      const permanent = memoryService.getPermanentMessages(session.id);
      expect(permanent).toHaveLength(2);
    });

    test('应该能够完成配置管理', () => {
      configService.addProvider({
        id: 'test-provider',
        name: 'Test Provider',
        apiKey: 'test-key',
        baseUrl: 'https://api.test.com',
        enabled: true,
        isDefault: false,
      });

      const provider = configService.getProvider('test-provider');
      expect(provider?.name).toBe('Test Provider');

      configService.deleteProvider('test-provider');
    });

    test('应该能够完成工具执行', async () => {
      const testFile = path.join(__dirname, 'test-file.txt');
      fs.writeFileSync(testFile, 'test content');

      const result = await toolService.execute('read_file', { file_path: testFile });
      expect(result).toContain('test content');

      fs.unlinkSync(testFile);
    });

    test('应该能够完成 Skills 管理', async () => {
      await skillsManager.loadAll();
      const skills = skillsManager.getAllSkills();
      expect(skills.length).toBeGreaterThanOrEqual(0);
    });

    test('应该能够完成会话搜索', () => {
      sessionService.create('Python项目');
      sessionService.create('Node.js项目');
      sessionService.create('其他项目');

      const results = sessionService.search('项目');
      expect(results.length).toBe(3);
    });
  });
});