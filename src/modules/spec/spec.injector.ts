import { specManager } from './spec.manager.js';
import { Spec } from './spec.types.js';

export class SpecInjector {
  constructor(private specMgr: typeof specManager = specManager) {}

  shouldInject(messageCount: number): boolean {
    return messageCount === 0;
  }

  buildSpecInjection(): string {
    const specs = this.specMgr.getLocalSpecs();

    const requiredSpecs = specs.filter(s => s.read_mode === 'required');
    const optionalSpecs = specs.filter(s => s.read_mode === 'optional');

    if (requiredSpecs.length === 0 && optionalSpecs.length === 0) {
      return '';
    }

    let injection = `

## 用户问题
{{原始用户问题}}

## 规范说明
你来分析一下这个问题是否为一个开发任务，如果是开发任务你必须要先阅读规范，然后严格按照规范开发，如果不是开发任务可以选择不读`;

    if (requiredSpecs.length > 0) {
      injection += `

### 必读规范
<specs>`;
      for (const spec of requiredSpecs) {
        const specPath = this.getSpecPath(spec.name);
        injection += `
  <spec>
    <name>${this.escapeXml(spec.name)}</name>
    <description>${this.escapeXml(spec.description)}</description>
    <path>${specPath}</path>
  </spec>`;
      }
      injection += `
</specs>`;
    }

    if (optionalSpecs.length > 0) {
      injection += `

### 选读规范
<specs>`;
      for (const spec of optionalSpecs) {
        const specPath = this.getSpecPath(spec.name);
        injection += `
  <spec>
    <name>${this.escapeXml(spec.name)}</name>
    <description>${this.escapeXml(spec.description)}</description>
    <path>${specPath}</path>
  </spec>`;
      }
      injection += `
</specs>`;
    }

    return injection;
  }

  injectIntoMessage(message: string): string {
    const injection = this.buildSpecInjection();
    if (!injection) {
      return message;
    }

    return injection.replace('{{原始用户问题}}', message);
  }

  private getSpecPath(name: string): string {
    const home = process.env.HOME || process.env.USERPROFILE || '~';
    return `${home}/.txcode/specs/${name}/SPEC.md`;
  }

  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

export const specInjector = new SpecInjector();
