/**
 * Tools 模块测试
 */

import * as fs from 'fs';
import * as path from 'path';
import { ToolService } from '../../src/modules/tools/tool.service';

describe('Tools 模块', () => {
  let toolService: ToolService;
  const testDir = path.join(__dirname, 'test-tools');

  beforeEach(() => {
    toolService = new ToolService();
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('内置工具', () => {
    test('应该加载 6 个内置工具', () => {
      const tools = toolService.getAll();
      expect(tools.length).toBe(6);
    });

    test('应该包含 read_file 工具', () => {
      expect(toolService.has('read_file')).toBe(true);
    });

    test('应该包含 write_file 工具', () => {
      expect(toolService.has('write_file')).toBe(true);
    });

    test('应该包含 edit_file 工具', () => {
      expect(toolService.has('edit_file')).toBe(true);
    });

    test('应该包含 execute_bash 工具', () => {
      expect(toolService.has('execute_bash')).toBe(true);
    });

    test('应该包含 find_files 工具', () => {
      expect(toolService.has('find_files')).toBe(true);
    });

    test('应该包含 search_content 工具', () => {
      expect(toolService.has('search_content')).toBe(true);
    });
  });

  describe('read_file 工具', () => {
    test('应该读取文件内容', async () => {
      const filePath = path.join(testDir, 'test.txt');
      fs.writeFileSync(filePath, 'Hello World\nLine 2\nLine 3');

      const result = await toolService.execute('read_file', { file_path: filePath });
      expect(result).toContain('Hello World');
    });

    test('不存在的文件应该返回错误', async () => {
      const result = await toolService.execute('read_file', { file_path: '/non/existent/file.txt' });
      expect(result).toContain('错误');
    });
  });

  describe('write_file 工具', () => {
    test('应该写入文件', async () => {
      const filePath = path.join(testDir, 'output.txt');
      const result = await toolService.execute('write_file', {
        file_path: filePath,
        content: 'Test content',
      });
      
      expect(result).toContain('成功');
      expect(fs.readFileSync(filePath, 'utf-8')).toBe('Test content');
    });
  });

  describe('edit_file 工具', () => {
    test('应该编辑文件', async () => {
      const filePath = path.join(testDir, 'edit.txt');
      fs.writeFileSync(filePath, 'Hello World');

      const result = await toolService.execute('edit_file', {
        file_path: filePath,
        old_string: 'World',
        new_string: 'TypeScript',
      });

      expect(result).toContain('成功');
      expect(fs.readFileSync(filePath, 'utf-8')).toBe('Hello TypeScript');
    });
  });

  describe('find_files 工具', () => {
    test('应该搜索文件', async () => {
      fs.writeFileSync(path.join(testDir, 'test.ts'), '');
      fs.writeFileSync(path.join(testDir, 'test.js'), '');

      const result = await toolService.execute('find_files', {
        pattern: '*.ts',
        directory: testDir,
      });

      expect(result).toContain('test.ts');
    });
  });

  describe('search_content 工具', () => {
    test('应该搜索内容', async () => {
      fs.writeFileSync(path.join(testDir, 'code.ts'), 'const x = 1;\nconst y = 2;');

      const result = await toolService.execute('search_content', {
        pattern: 'const',
        directory: testDir,
      });

      expect(result).toContain('code.ts');
    });
  });

  describe('工具管理', () => {
    test('register() 应该注册新工具', () => {
      toolService.register({
        name: 'custom_tool',
        description: 'A custom tool',
        parameters: { type: 'object', properties: {} },
        execute: async () => 'done',
      });

      expect(toolService.has('custom_tool')).toBe(true);
    });

    test('remove() 应该移除工具', () => {
      toolService.register({
        name: 'temp_tool',
        description: 'Temp',
        parameters: { type: 'object', properties: {} },
        execute: async () => 'done',
      });

      toolService.remove('temp_tool');
      expect(toolService.has('temp_tool')).toBe(false);
    });

    test('getToolDefinitions() 应该返回工具定义', () => {
      const definitions = toolService.getToolDefinitions();
      expect(definitions.length).toBe(6);
      expect(definitions[0]).toHaveProperty('type', 'function');
      expect(definitions[0].function).toHaveProperty('name');
    });
  });
});