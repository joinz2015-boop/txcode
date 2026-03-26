export interface ValidationResult {
  valid: boolean;
  error?: string;
  cleanedContent?: string;
  isFaultTolerance?: boolean;
}

export class ContentValidator {
  validate(content: string): ValidationResult {
    const trimmed = content.trim();
    
    if (this.hasReactStructure(trimmed)) {
      return {
        valid: true,
        cleanedContent: this.extractContent(trimmed)
      };
    }

    if (this.hasAnyReactTag(trimmed)) {
      return {
        valid: false,
        error: '结构错误：XML 结构不完整或格式错误。请确保返回完整的 <react><thought>...</thought></react> 结构。'
      };
    }

    const faultToleranceContent = `<react>
  <thought>任务已完成</thought>
  <final_answer><![CDATA[${trimmed}]]></final_answer>
</react>`;
    
    return {
      valid: true,
      cleanedContent: faultToleranceContent,
      isFaultTolerance: true
    };
  }

  private hasReactStructure(content: string): boolean {
    const pattern = /<react>\s*<thought>[\s\S]*?<\/thought>[\s\S]*?<\/react>/i;
    return pattern.test(content);
  }

  private hasAnyReactTag(content: string): boolean {
    return /<react>/i.test(content) || /<thought>/i.test(content) || /<action>/i.test(content);
  }

  private extractContent(content: string): string {
    const codeBlockMatch = content.match(/```xml\s*([\s\S]*?)```/i);
    if (codeBlockMatch && codeBlockMatch[1]) {
      return codeBlockMatch[1].trim();
    }

    const anyCodeBlockMatch = content.match(/```\s*([\s\S]*?)```/i);
    if (anyCodeBlockMatch && anyCodeBlockMatch[1]) {
      const inner = anyCodeBlockMatch[1].trim();
      if (this.hasReactStructure(inner)) {
        return inner;
      }
    }

    const reactMatch = content.match(/<react>[\s\S]*?<\/react>/i);
    if (reactMatch) {
      return reactMatch[0];
    }

    return content;
  }
}

export const contentValidator = new ContentValidator();
