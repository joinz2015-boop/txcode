/**
 * ReAct 响应解析器
 * 
 * 本模块负责解析 AI 返回的文本内容
 * AI 返回的是包含 Thought、Action、Observation 等字段的文本
 * 需要从中提取出结构化的步骤信息
 * 
 * 解析流程：
 * 1. splitBlocks() - 按 "---" 分隔符分割文本为多个块
 * 2. 识别每块的类型：
 *    - content: 大文本内容 (用于占位符替换)
 *    - step: 步骤块 (包含 thought, action, action_input, final_answer 等)
 *    - observation: 观察结果块
 * 3. replacePlaceholders() - 替换占位符 (如 $content:1)
 * 4. 返回结构化的 steps 数组和 finalAnswer
 * 
 * AI 输出格式示例（XML）：
 * ```xml
 * <react>
 *   <thought>我需要读取文件</thought>
 *   <action>readFile</action>
 *   <action_input>
 *     <file_path>/path/to/file</file_path>
 *   </action_input>
 *   <keep_context>true</keep_context>
 * </react>
 * ---
 * <react>
 *   <thought>需要创建一个组件</thought>
 *   <action>write_file</action>
 *   <action_input>
 *     <file_path>src/Hello.tsx</file_path>
 *     <content><![CDATA[import React from 'react';]]></content>
 *   </action_input>
 * </react>
 * ---
 * Tool Result:
 * ---
 * 观察结果
 * ---
 * ```
 */

import { ReActStep, ParsedBlock } from './react.types.js';
import { parseStringPromise } from 'xml2js';

/**
 * ReActParser 类
 * 
 * 将 AI 返回的文本解析为结构化的 ReActStep 数组
 */
export class ReActParser {
  async parse(content: string): Promise<{ steps: ReActStep[]; finalAnswer: string }> {
    const blocks = await this.splitBlocks(content);
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

  private async splitBlocks(content: string): Promise<ParsedBlock[]> {
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

      // 尝试解析 XML 格式
      const xmlResult = await this.parseXMLBlock(trimmed);
      if (xmlResult) {
        blocks.push(xmlResult);
        continue;
      }

      // 尝试解析 JSON 格式
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

  /**
   * 解析 XML 格式的块
   */
  private async parseXMLBlock(content: string): Promise<ParsedBlock | null> {
    try {
      const wrappedXml = `<root>${content}</root>`;
      const parsed = await parseStringPromise(wrappedXml, {
        trim: false,
        explicitArray: false,
        mergeAttrs: true,
      });

      if (!parsed?.root?.react) {
        return null;
      }

      const react = parsed.root.react;
      const data: Record<string, any> = {};

      if (react.thought) {
        data.thought = this.extractValue(react.thought);
      }

      if (react.final_answer) {
        data.final_answer = this.extractValue(react.final_answer);
        return { type: 'step', data };
      }

      if (react.action) {
        data.action = this.extractValue(react.action);
      }

      if (react.keep_context) {
        const keepCtx = this.extractValue(react.keep_context);
        data.keep_context = keepCtx?.toLowerCase() === 'true';
      }

      if (react.action_input) {
        data.action_input = await this.parseXMLParams(react.action_input);
      }

      return { type: 'step', data };
    } catch (e) {
      console.error('XML parse error:', e);
      return null;
    }
  }

  private extractValue(value: any): string {
    if (!value) return '';
    if (typeof value === 'string') return value.trim();
    if (typeof value === 'object' && '_' in value) {
      return this.extractCDATAOrText(String(value._));
    }
    return String(value);
  }

  /**
   * 解析 action_input 参数节点
   */
  private async parseXMLParams(actionInput: any): Promise<Record<string, any>> {
    const params: Record<string, any> = {};

    if (!actionInput || typeof actionInput !== 'object') {
      return params;
    }

    for (const [key, value] of Object.entries(actionInput)) {
      params[key] = this.extractValue(value);
    }

    return params;
  }

  /**
   * 从 XML 内容中提取纯文本，处理 CDATA
   */
  private extractCDATAOrText(content: string): string {
    // 匹配 CDATA
    const cdataMatch = content.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
    if (cdataMatch) {
      return cdataMatch[1];
    }
    return content.trim();
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
    const formattedObs = typeof observation === 'string' 
      ? `<![CDATA[${observation}]]>` 
      : `<![CDATA[${JSON.stringify(observation, null, 2)}]]>`;
    return `---
<react>
  <observation>${formattedObs}</observation>
</react>
---`;
  }
}

export const reactParser = new ReActParser();
