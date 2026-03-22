/**
 * Context 模块测试
 */

import * as fs from 'fs';
import * as path from 'path';
import { ContextService } from '../../src/modules/context/context.service';

describe('Context 模块', () => {
  let contextService: ContextService;
  const testDir = path.join(__dirname, 'test-project');

  beforeAll(() => {
    contextService = new ContextService();
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });

  afterAll(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('detectLanguage()', () => {
    test('应该检测 TypeScript 项目', () => {
      const packagePath = path.join(testDir, 'package.json');
      fs.writeFileSync(packagePath, '{"name": "test"}');
      
      const lang = contextService.detectLanguage(testDir);
      expect(lang).toBe('typescript');
      
      fs.unlinkSync(packagePath);
    });

    test('应该检测 Python 项目', () => {
      const reqPath = path.join(testDir, 'requirements.txt');
      fs.writeFileSync(reqPath, 'flask==2.0');
      
      const lang = contextService.detectLanguage(testDir);
      expect(lang).toBe('python');
      
      fs.unlinkSync(reqPath);
    });

    test('未知类型应该返回 unknown', () => {
      const lang = contextService.detectLanguage('/tmp/non-existent');
      expect(lang).toBe('unknown');
    });
  });

  describe('getPackageInfo()', () => {
    test('应该解析 package.json', () => {
      const packagePath = path.join(testDir, 'package.json');
      fs.writeFileSync(packagePath, JSON.stringify({ name: 'test-pkg', version: '1.0.0' }));
      
      const info = contextService.getPackageInfo(testDir);
      expect(info?.name).toBe('test-pkg');
      expect(info?.version).toBe('1.0.0');
      
      fs.unlinkSync(packagePath);
    });

    test('没有 package.json 应该返回 null', () => {
      const info = contextService.getPackageInfo('/tmp/non-existent');
      expect(info).toBeNull();
    });
  });

  describe('getFileStructure()', () => {
    test('应该返回文件结构', () => {
      fs.writeFileSync(path.join(testDir, 'test.txt'), 'test');
      fs.mkdirSync(path.join(testDir, 'src'), { recursive: true });
      fs.writeFileSync(path.join(testDir, 'src', 'index.ts'), '// test');
      
      const structure = contextService.getFileStructure(testDir, 1);
      expect(structure.length).toBeGreaterThan(0);
      
      fs.unlinkSync(path.join(testDir, 'test.txt'));
      fs.rmSync(path.join(testDir, 'src'), { recursive: true });
    });
  });

  describe('getReadme()', () => {
    test('应该读取 README', () => {
      const readmePath = path.join(testDir, 'README.md');
      fs.writeFileSync(readmePath, '# Test Project\n\nThis is a test.');
      
      const readme = contextService.getReadme(testDir);
      expect(readme).toContain('Test Project');
      
      fs.unlinkSync(readmePath);
    });

    test('没有 README 应该返回 undefined', () => {
      const readme = contextService.getReadme(testDir);
      expect(readme).toBeUndefined();
    });
  });

  describe('getProjectSummary()', () => {
    test('应该返回项目摘要', () => {
      fs.writeFileSync(path.join(testDir, 'package.json'), JSON.stringify({ name: 'test' }));
      
      const summary = contextService.getProjectSummary(testDir);
      expect(summary).toContain('Project:');
      expect(summary).toContain('typescript');
      
      fs.unlinkSync(path.join(testDir, 'package.json'));
    });
  });
});