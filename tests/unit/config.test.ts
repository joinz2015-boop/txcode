/**
 * Config 模块测试
 */

import { DbService } from '../../src/modules/db/db.service';
import { ConfigService } from '../../src/modules/config/config.service';

describe('Config 模块', () => {
  let dbService: DbService;
  let configService: ConfigService;

  beforeEach(async () => {
    dbService = new DbService(':memory:');
    await dbService.init();
    configService = new ConfigService(dbService);
  });

  afterEach(() => {
    dbService.close();
  });

  describe('Provider 操作', () => {
    test('addProvider() 应该添加服务商', () => {
      configService.addProvider({
        id: 'test',
        name: 'Test Provider',
        apiKey: 'sk-test',
        baseUrl: 'https://api.test.com',
        enabled: true,
        isDefault: false,
      });

      const providers = configService.getProviders();
      expect(providers).toHaveLength(1);
      expect(providers[0].name).toBe('Test Provider');
    });

    test('第一个添加的服务商应该自动设为默认', () => {
      configService.addProvider({
        id: 'first',
        name: 'First',
        apiKey: 'sk-first',
        baseUrl: 'https://api.first.com',
        enabled: true,
        isDefault: false,
      });

      const provider = configService.getProvider('first');
      expect(provider?.isDefault).toBe(true);
    });

    test('deleteProvider() 应该删除服务商', () => {
      configService.addProvider({
        id: 'to-delete',
        name: 'Delete Me',
        apiKey: 'sk-delete',
        baseUrl: 'https://api.delete.com',
        enabled: true,
        isDefault: false,
      });

      configService.deleteProvider('to-delete');
      expect(configService.getProvider('to-delete')).toBeUndefined();
    });

    test('setDefaultProvider() 应该切换默认服务商', () => {
      configService.addProvider({
        id: 'p1',
        name: 'P1',
        apiKey: 'sk-p1',
        baseUrl: 'https://api.p1.com',
        enabled: true,
        isDefault: false,
      });

      configService.addProvider({
        id: 'p2',
        name: 'P2',
        apiKey: 'sk-p2',
        baseUrl: 'https://api.p2.com',
        enabled: true,
        isDefault: false,
      });

      configService.setDefaultProvider('p2');

      expect(configService.getProvider('p1')?.isDefault).toBe(false);
      expect(configService.getProvider('p2')?.isDefault).toBe(true);
    });
  });

  describe('配置项操作', () => {
    test('get() / set() 应该读写配置', () => {
      configService.set('test.key', 'test-value');
      const value = configService.get<string>('test.key');
      expect(value).toBe('test-value');
    });

    test('get() 应该支持 JSON 值', () => {
      const obj = { nested: { value: 123 } };
      configService.set('test.json', obj);
      const value = configService.get<typeof obj>('test.json');
      expect(value?.nested.value).toBe(123);
    });
  });
});