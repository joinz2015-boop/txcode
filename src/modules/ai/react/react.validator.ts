export interface ValidationResult {
  valid: boolean;
  error?: string;
  cleanedContent?: string;
}

export class ContentValidator {
  validate(content: string): ValidationResult {
    const trimmed = content.trim();
    
    if (!this.hasReactStructure(trimmed)) {
      return {
        valid: false,
        error: '结构错误：未找到 <react><thought>...</thought></react> 结构。请确保返回正确的 XML 格式。'
      };
    }

    const cleanedContent = this.extractContent(trimmed);
    
    return {
      valid: true,
      cleanedContent
    };
  }

  private hasReactStructure(content: string): boolean {
    const pattern = /<react>\s*<thought>[\s\S]*?<\/thought>[\s\S]*?<\/react>/i;
    return pattern.test(content);
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
