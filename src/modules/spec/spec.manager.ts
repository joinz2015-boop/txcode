import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { Spec, SpecMetadata } from './spec.types.js';

export class SpecManager {
  private projectSpecsPath: string | null = null;

  setProjectPath(projectPath: string | null | undefined): void {
    if (projectPath) {
      let normalizedPath = projectPath;
      if (normalizedPath.startsWith('/e/') || normalizedPath.startsWith('/E/')) {
        normalizedPath = normalizedPath.replace(/^\/([A-Za-z])\//, (match, drive) => `${drive.toUpperCase()}:/`);
      }
      this.projectSpecsPath = path.join(normalizedPath, '.txcode', 'specs');
    } else {
      this.projectSpecsPath = null;
    }
  }

  private getSpecsPath(): string | null {
    return this.projectSpecsPath;
  }

  private ensureProjectSpecsDir(): void {
    if (this.projectSpecsPath && !fs.existsSync(this.projectSpecsPath)) {
      fs.mkdirSync(this.projectSpecsPath, { recursive: true });
    }
  }

  getLocalSpecs(): Spec[] {
    if (!this.projectSpecsPath || !fs.existsSync(this.projectSpecsPath)) {
      return [];
    }
    return this.loadSpecsFromDir(this.projectSpecsPath);
  }

  private loadSpecsFromDir(specsPath: string): Spec[] {
    const specs: Spec[] = [];

    if (!fs.existsSync(specsPath)) {
      return specs;
    }

    try {
      const entries = fs.readdirSync(specsPath, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const specPath = path.join(specsPath, entry.name, 'SPEC.md');
          if (fs.existsSync(specPath)) {
            const spec = this.loadSpec(specPath);
            if (spec) {
              specs.push(spec);
            }
          }
        }
      }
    } catch {
      // 忽略错误
    }

    return specs;
  }

  private loadSpec(filePath: string): Spec | null {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const dirName = path.basename(path.dirname(filePath));

      const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);

      if (!frontmatterMatch) {
        return {
          name: dirName,
          description: content.substring(0, 200),
          read_mode: 'optional',
          content: content,
          rawContent: content,
          filePath,
        };
      }

      const frontmatterStr = frontmatterMatch[1];
      const rawContent = frontmatterMatch[2].trim();

      try {
        const metadata = yaml.load(frontmatterStr) as SpecMetadata;

        if (!metadata.name) {
          return {
            name: dirName,
            description: '',
            read_mode: 'optional',
            content: content,
            rawContent: rawContent,
            filePath,
          };
        }

        return {
          name: metadata.name,
          description: metadata.description || '',
          read_mode: metadata.read_mode === 'required' ? 'required' : 'optional',
          content: content,
          rawContent: rawContent,
          filePath,
        };
      } catch {
        return {
          name: dirName,
          description: frontmatterStr.substring(0, 200),
          read_mode: 'optional',
          content: content,
          rawContent: rawContent,
          filePath,
        };
      }
    } catch {
      return null;
    }
  }

  getSpecContent(name: string): string | null {
    if (!this.projectSpecsPath) {
      return null;
    }

    const projectSpecPath = path.join(this.projectSpecsPath, name, 'SPEC.md');
    if (fs.existsSync(projectSpecPath)) {
      try {
        return fs.readFileSync(projectSpecPath, 'utf-8');
      } catch {
        return null;
      }
    }
    return null;
  }

  deleteSpec(name: string): boolean {
    if (!this.projectSpecsPath) {
      return false;
    }

    const specDir = path.join(this.projectSpecsPath, name);
    if (!fs.existsSync(specDir)) {
      return false;
    }

    try {
      fs.rmSync(specDir, { recursive: true });
      return true;
    } catch {
      return false;
    }
  }

  saveSpec(name: string, content: string): boolean {
    if (!this.projectSpecsPath) {
      return false;
    }

    this.ensureProjectSpecsDir();
    const specDir = path.join(this.projectSpecsPath, name);

    if (!fs.existsSync(specDir)) {
      fs.mkdirSync(specDir, { recursive: true });
    }

    const specPath = path.join(specDir, 'SPEC.md');
    try {
      fs.writeFileSync(specPath, content, 'utf-8');
      return true;
    } catch {
      return false;
    }
  }

  saveSpecFile(name: string, filePath: string, content: string): boolean {
    if (!this.projectSpecsPath) {
      return false;
    }

    this.ensureProjectSpecsDir();
    const specDir = path.join(this.projectSpecsPath, name);
    const targetPath = path.join(specDir, filePath);

    const targetDir = path.dirname(targetPath);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    try {
      fs.writeFileSync(targetPath, content, 'utf-8');
      return true;
    } catch {
      return false;
    }
  }

  getLocalSpecsPath(): string | null {
    return this.getSpecsPath();
  }
}

export const specManager = new SpecManager();
