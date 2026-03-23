import { ReActStep, ParsedBlock } from './react.types.js';

export class ReActParser {
  parse(content: string): { steps: ReActStep[]; finalAnswer: string } {
    const blocks = this.splitBlocks(content);
    const steps: ReActStep[] = [];
    const contentMap = new Map<string, string>();
    let finalAnswer = '';

    for (const block of blocks) {
      if (block.type === 'content') {
        contentMap.set(block.contentKey!, block.content || '');
      } else if (block.type === 'step') {
        const data = block.data;
        const replacedInput = this.replacePlaceholders(data.action_input, contentMap);
        
        if (data.final_answer) {
          finalAnswer = data.final_answer;
          steps.push({
            thought: data.thought || '',
            action: '',
            actionInput: {},
            final_answer: data.final_answer,
          });
        } else {
          steps.push({
            thought: data.thought || '',
            action: data.action || '',
            actionInput: replacedInput,
            keepContext: data.keep_context || false,
          });
        }
      } else if (block.type === 'observation') {
        const lastStep = steps[steps.length - 1];
        if (lastStep) {
          lastStep.observation = block.data;
        }
      }
    }

    return { steps, finalAnswer };
  }

  private splitBlocks(content: string): ParsedBlock[] {
    const blocks: ParsedBlock[] = [];
    const parts = content.split(/\n---\n/);

    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;

      const contentMatch = trimmed.match(/^\$(\S+)\n([\s\S]*)$/);
      if (contentMatch) {
        blocks.push({
          type: 'content',
          contentKey: contentMatch[1],
          content: contentMatch[2],
        });
        continue;
      }

      try {
        const json = JSON.parse(trimmed);
        if (json.observation !== undefined) {
          blocks.push({ type: 'observation', data: json.observation });
        } else {
          blocks.push({ type: 'step', data: json });
        }
      } catch {
        // 尝试提取 JSON 代码块
        const jsonBlockMatch = trimmed.match(/```json\s*([\s\S]*?)```/);
        if (jsonBlockMatch) {
          try {
            const json = JSON.parse(jsonBlockMatch[1].trim());
            if (json.observation !== undefined) {
              blocks.push({ type: 'observation', data: json.observation });
            } else {
              blocks.push({ type: 'step', data: json });
            }
          } catch {
            // 忽略解析失败
          }
        }
      }
    }

    return blocks;
  }

  private replacePlaceholders(
    obj: Record<string, any>,
    contentMap: Map<string, string>
  ): Record<string, any> {
    if (!obj) return {};
    
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        const match = value.match(/^\$(\S+)$/);
        if (match) {
          const placeholderKey = match[1];
          const replacement = contentMap.get(placeholderKey);
          if (replacement !== undefined) {
            result[key] = replacement;
          } else {
            result[key] = value;
          }
        } else if (this.isEncodedContent(value)) {
          result[key] = this.decodeContent(value);
        } else {
          result[key] = value;
        }
      } else if (typeof value === 'object' && value !== null) {
        result[key] = this.replacePlaceholders(value, contentMap);
      } else {
        result[key] = value;
      }
    }
    return result;
  }

  private isEncodedContent(value: string): boolean {
    if (value.startsWith('$$content:') || value.includes('$content:2')) {
      return true;
    }
    const dollarCount = (value.match(/\$/g) || []).length;
    if (dollarCount > 3 && value.includes('content:')) {
      return true;
    }
    return false;
  }

  private decodeContent(value: string): string {
    const decodedParts: string[] = [];
    const regex = /\$\$?content:(\d+)([a-zA-Z])/g;
    let match;
    while ((match = regex.exec(value)) !== null) {
      decodedParts.push(match[2]);
    }
    return decodedParts.length > 0 ? decodedParts.join('') : value;
  }

  hasFinalAnswer(steps: ReActStep[]): boolean {
    return steps.some(s => s.final_answer !== undefined);
  }

  formatObservation(observation: any): string {
    if (typeof observation === 'string') {
      return observation;
    }
    return JSON.stringify(observation, null, 2);
  }

  buildObservationResponse(observation: any): string {
    return `---
{
  "observation": ${JSON.stringify(observation)}
}
---`;
  }
}

export const reactParser = new ReActParser();
