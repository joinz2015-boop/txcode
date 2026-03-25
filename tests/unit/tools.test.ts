/**
 * Tools module tests
 */

import * as fs from 'fs';
import * as path from 'path';
import { ToolService } from '../../src/modules/tools/tool.service';

describe('Tools Module', () => {
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

  describe('Built-in tools', () => {
    test('should load 6 built-in tools', () => {
      const tools = toolService.getAll();
      expect(tools.length).toBe(6);
    });

    test('should contain read_file tool', () => {
      expect(toolService.has('read_file')).toBe(true);
    });

    test('should contain write_file tool', () => {
      expect(toolService.has('write_file')).toBe(true);
    });

    test('should contain edit_file tool', () => {
      expect(toolService.has('edit_file')).toBe(true);
    });

    test('should contain execute_bash tool', () => {
      expect(toolService.has('execute_bash')).toBe(true);
    });

    test('should contain find_files tool', () => {
      expect(toolService.has('find_files')).toBe(true);
    });

    test('should contain search_content tool', () => {
      expect(toolService.has('search_content')).toBe(true);
    });
  });

  describe('read_file tool', () => {
    test('should read file content', async () => {
      const filePath = path.join(testDir, 'test.txt');
      fs.writeFileSync(filePath, 'Hello World\nLine 2\nLine 3');

      const result = await toolService.execute('read_file', { file_path: filePath });
      expect(result).toContain('Hello World');
    });

    test('should return error for non-existent file', async () => {
      const result = await toolService.execute('read_file', { file_path: '/non/existent/file.txt' });
      expect(result).toContain('error');
    });
  });

  describe('write_file tool', () => {
    test('should write file', async () => {
      const filePath = path.join(testDir, 'output.txt');
      const result = await toolService.execute('write_file', {
        file_path: filePath,
        content: 'Test content',
      });
      
      expect(result).toContain('success');
      expect(fs.readFileSync(filePath, 'utf-8')).toBe('Test content');
    });
  });

  describe('edit_file tool', () => {
    test('should edit file', async () => {
      const filePath = path.join(testDir, 'edit.txt');
      fs.writeFileSync(filePath, 'Hello World');

      const result = await toolService.execute('edit_file', {
        file_path: filePath,
        old_string: 'World',
        new_string: 'TypeScript',
      });

      expect(result).toContain('success');
      expect(fs.readFileSync(filePath, 'utf-8')).toBe('Hello TypeScript');
    });

    test('should fail when old_string not found', async () => {
      const filePath = path.join(testDir, 'edit2.txt');
      fs.writeFileSync(filePath, 'Hello World');

      const result = await toolService.execute('edit_file', {
        file_path: filePath,
        old_string: 'NotExists',
        new_string: 'TypeScript',
      });

      expect(result).toContain('old_string not found');
    });

    test('should fail when old_string has extra spaces', async () => {
      const filePath = path.join(testDir, 'edit3.txt');
      fs.writeFileSync(filePath, 'Hello World');

      const result = await toolService.execute('edit_file', {
        file_path: filePath,
        old_string: 'World ',  // 多了一个空格
        new_string: 'TypeScript',
      });

      expect(result).toContain('old_string not found');
    });

    test('should replace_all work', async () => {
      const filePath = path.join(testDir, 'edit4.txt');
      fs.writeFileSync(filePath, 'foo bar foo baz');

      const result = await toolService.execute('edit_file', {
        file_path: filePath,
        old_string: 'foo',
        new_string: 'baz',
        replace_all: true,
      });

      expect(result).toContain('success');
      expect(fs.readFileSync(filePath, 'utf-8')).toBe('baz bar baz baz');
    });

    test('should fail on multiple matches without replace_all', async () => {
      const filePath = path.join(testDir, 'edit5.txt');
      fs.writeFileSync(filePath, 'foo foo bar');

      const result = await toolService.execute('edit_file', {
        file_path: filePath,
        old_string: 'foo',
        new_string: 'baz',
      });

      expect(result).toContain('multiple matches');
    });
  });

  describe('find_files tool', () => {
    test('should search files', async () => {
      fs.writeFileSync(path.join(testDir, 'test.ts'), '');
      fs.writeFileSync(path.join(testDir, 'test.js'), '');

      const result = await toolService.execute('find_files', {
        pattern: '*.ts',
        directory: testDir,
      });

      expect(result).toContain('test.ts');
    });
  });

  describe('search_content tool', () => {
    test('should search content', async () => {
      fs.writeFileSync(path.join(testDir, 'code.ts'), 'const x = 1;\nconst y = 2;');

      const result = await toolService.execute('search_content', {
        pattern: 'const',
        directory: testDir,
      });

      expect(result).toContain('code.ts');
    });
  });

  describe('Tool management', () => {
    test('register() should register new tool', () => {
      toolService.register({
        name: 'custom_tool',
        description: 'A custom tool',
        parameters: { type: 'object', properties: {} },
        execute: async () => ({ success: true, output: 'done' }),
      });

      expect(toolService.has('custom_tool')).toBe(true);
    });

    test('remove() should remove tool', () => {
      toolService.register({
        name: 'temp_tool',
        description: 'Temp',
        parameters: { type: 'object', properties: {} },
        execute: async () => ({ success: true, output: 'done' }),
      });

      toolService.remove('temp_tool');
      expect(toolService.has('temp_tool')).toBe(false);
    });

    test('getToolDefinitions() should return tool definitions', () => {
      const definitions = toolService.getToolDefinitions();
      expect(definitions.length).toBe(6);
      expect(definitions[0]).toHaveProperty('type', 'function');
      expect(definitions[0].function).toHaveProperty('name');
    });
  });
});