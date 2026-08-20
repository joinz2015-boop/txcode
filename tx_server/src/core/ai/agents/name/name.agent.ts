import { BaseProvider, ChatMessage } from '../../../../entity/ai.entity.js';
import { MemoryService } from '../../../../services/memory/memory.service.js';

async function loadRoleTemplate(): Promise<string> {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    return await fs.readFile(path.join(__dirname, 'prompts', 'role.txt'), 'utf-8');
  } catch {
    return '你是一个专业的对话总结助手。请根据以下对话历史，总结一个10-20字的会话名称，直接输出名称，不要任何额外说明。';
  }
}

export interface NameAgentInput {
  provider: BaseProvider;
  sessionId: string;
  memoryService: MemoryService;
  userInput?: string;
}

export interface NameAgentOutput {
  name: string;
}

export class NameAgent {
  private provider: BaseProvider;
  private sessionId: string;
  private memoryService: MemoryService;
  private userInput?: string;

  constructor(input: NameAgentInput) {
    this.provider = input.provider;
    this.sessionId = input.sessionId;
    this.memoryService = input.memoryService;
    this.userInput = input.userInput;
  }

  async run(): Promise<NameAgentOutput> {
    const systemPrompt = await loadRoleTemplate();

    let userPrompt: string;
    if (this.userInput) {
      userPrompt = `请根据以下用户输入，总结一个10-20字的会话名称，直接输出名称：\n\n${this.userInput}`;
    } else {
      const messages = this.memoryService.getAllMessages(this.sessionId);

      const recentMessages = messages
        .filter(m => m.role !== 'system')
        .slice(-20);

      const conversationText = recentMessages
        .map(m => {
          const roleLabel = m.role === 'user' ? '用户' : 'AI';
          let content = m.content;
          try {
            const parsed = JSON.parse(content);
            if (parsed?.type === 'assistant_with_tools') {
              content = parsed.text || parsed.content || content;
            } else if (parsed?.type === 'tool_result') {
              content = parsed.output || content;
            }
          } catch {}
          return `${roleLabel}: ${content}`;
        })
        .join('\n\n');

      userPrompt = `请根据以下对话历史，总结一个10-20字的会话名称：\n\n${conversationText}`;
    }

    const chatMessages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    const response = await this.provider.chat(chatMessages, {
      maxTokens: 8192,
    });

    const name = response.content?.trim().slice(0, 20) || '未命名会话';

    return { name };
  }
}
