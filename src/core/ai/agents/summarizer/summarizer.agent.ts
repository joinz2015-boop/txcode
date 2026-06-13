import { ConfigService, configService } from '../../../../services/config/config.service.js';
import { getProvider } from '../../provider/provider.router.js';
import { SummarizerResult, SummarizerOptions, CompactionCheckResult } from '../../../../entity/summarizer.entity.js';
import { SessionService } from '../../../../services/session/session.service.js';
import { MemoryService } from '../../../../services/memory/memory.service.js';
import txConfig from '../../../../config/tx.config.js';

async function loadRoleTemplate(): Promise<string> {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    return await fs.readFile(path.join(__dirname, 'prompts', 'role.txt'), 'utf-8');
  } catch {
    return '请对上面的对话内容进行详细但简洁的摘要。重点关注对继续对话有帮助的信息。';
  }
}

export class SummarizerAgent {
  private configService: ConfigService;
  private sessionService: SessionService;
  private memoryService: MemoryService;
  private roleTemplate: string | null = null;

  constructor(
    sessionService: SessionService,
    memoryService: MemoryService,
    configSvc?: ConfigService
  ) {
    this.sessionService = sessionService;
    this.memoryService = memoryService;
    this.configService = configSvc || configService;
  }

  private async getRoleTemplate(): Promise<string> {
    if (!this.roleTemplate) {
      this.roleTemplate = await loadRoleTemplate();
    }
    return this.roleTemplate;
  }

  private getContextConfig() {
    return txConfig.ai.context;
  }

  private getCurrentModel() {
    const modelName = this.configService.getDefaultModel();
    const models = this.configService.getAllModels();
    return models.find(m => m.name === modelName) || null;
  }

  async compact(options: SummarizerOptions): Promise<SummarizerResult> {
    const { sessionId, onProgress } = options;

    const session = this.sessionService.get(sessionId);
    if (!session) {
      return {
        success: false,
        summary: '',
        tokensBefore: 0,
        tokensAfter: 0,
        error: 'Session not found',
      };
    }

    const messages = this.memoryService.getMessagesForAI(sessionId, session.summaryMessageId);
    if (messages.length === 0) {
      return {
        success: false,
        summary: '',
        tokensBefore: 0,
        tokensAfter: 0,
        error: 'No messages to compact',
      };
    }

    const summaryMessageId = this.memoryService.addMessage(
      sessionId,
      'user',
      '/compact',
      true
    );

    const tokensBefore = session.promptTokens + session.completionTokens;

    onProgress?.('Generating summary...');

    try {
      const chatMessages = messages
        .filter(m => {
          if (m.role === 'tool') return false;
          try {
            const parsed = JSON.parse(m.content);
            if (parsed?.type === 'tool_result') return false;
          } catch { }
          return true;
        })
        .map(m => {
          let content = m.content;
          try {
            const parsed = JSON.parse(m.content);
            if (parsed?.type === 'assistant_with_tools') {
              content = parsed.text || parsed.content || m.content;
            } else if (parsed?.type === 'tool_result') {
              content = parsed.output || m.content;
            }
          } catch { }
          return { role: m.role, content };
        });

      const roleTemplate = await this.getRoleTemplate();
      const summarizerMessages = [
        ...chatMessages.map(m => ({
          role: m.role as 'user' | 'assistant' | 'system',
          content: m.content,
        })),
        {
          role: 'user' as const,
          content: roleTemplate,
        },
      ];

      const provider = getProvider();
      const response = await provider.chat(summarizerMessages, {
        maxTokens: 2000,
      });

      const summary = response.content?.trim() || '';
      const reasoning = response.reasoning;

      if (!summary) {
        return {
          success: false,
          summary: '',
          tokensBefore,
          tokensAfter: tokensBefore,
          error: 'Empty summary returned',
        };
      }

      onProgress?.('Saving summary...');

      const assistantMsgId = this.memoryService.addMessage(
        sessionId,
        'assistant',
        summary,
        true
      );

      console.log(`[Compact] /compact msgId=${summaryMessageId}, summary msgId=${assistantMsgId}`);
      
      this.sessionService.updateSummary(sessionId, assistantMsgId);
      this.sessionService.resetTokens(sessionId);

      return {
        success: true,
        summary,
        reasoning,
        tokensBefore,
        tokensAfter: Math.round(tokensBefore * 0.3),
      };
    } catch (error) {
      console.error('[Compact] Error:', error);
      return {
        success: false,
        summary: '',
        tokensBefore,
        tokensAfter: tokensBefore,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  checkNeedsCompact(sessionId: string, promptTokens: number = 0): CompactionCheckResult {
    const config = this.getContextConfig();
    const model = this.getCurrentModel();

    let threshold: number;
    if (config.mode === 'percentage' && model?.contextWindow) {
      threshold = Math.floor(model.contextWindow * config.percentage);
    } else {
      threshold = config.maxTokens;
    }

    if (!config.autoCompact) {
      return { needed: false, reason: 'Auto compact disabled', promptTokens, threshold };
    }

    if (promptTokens < threshold) {
      return {
        needed: false,
        reason: `Prompt tokens (${promptTokens}) below threshold (${threshold})`,
        promptTokens,
        threshold,
      };
    }

    return {
      needed: true,
      reason: `Prompt tokens (${promptTokens}) exceeded threshold (${threshold})`,
      promptTokens,
      threshold,
    };
  }
}
