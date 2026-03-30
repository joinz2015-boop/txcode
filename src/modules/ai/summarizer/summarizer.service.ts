/**
 * Summarizer 服务
 * 
 * 职责：
 * - 检查是否需要压缩
 * - 执行上下文压缩
 * - 生成会话摘要
 */

import { ConfigService, configService } from '../../config/config.service.js';
import { OpenAIProvider } from '../openai.provider.js';
import { buildSummarizerMessages } from './summarizer.prompts.js';
import { SummarizerResult, SummarizerOptions, CompactionCheckResult } from './summarizer.types.js';
import { SessionService } from '../../session/session.service.js';
import { MemoryService } from '../../memory/memory.service.js';
import txConfig from '../../../config/tx.config.js';

export class SummarizerService {
  private configService: ConfigService;
  private sessionService: SessionService;
  private memoryService: MemoryService;

  constructor(
    sessionService: SessionService,
    memoryService: MemoryService,
    configSvc?: ConfigService
  ) {
    this.sessionService = sessionService;
    this.memoryService = memoryService;
    this.configService = configSvc || configService;
  }

  private getProvider(): OpenAIProvider {
    const provider = this.configService.getDefaultProvider();
    if (!provider) {
      throw new Error('No default AI provider configured');
    }

    const models = this.configService.getModels(provider.id);
    const defaultModel = models.find(m => m.enabled) || models[0] || { name: 'gpt-4' };

    return new OpenAIProvider({
      apiKey: provider.apiKey,
      baseUrl: provider.baseUrl,
      defaultModel: defaultModel.name,
    });
  }

  private getContextConfig() {
    return txConfig.ai.context;
  }

  private getCurrentModel() {
    const providers = this.configService.getProviders();
    for (const provider of providers) {
      const models = this.configService.getModels(provider.id);
      const enabledModel = models.find(m => m.enabled);
      if (enabledModel) {
        return enabledModel;
      }
    }
    return null;
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

      const summarizerMessages = buildSummarizerMessages(chatMessages);

      const provider = this.getProvider();
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

      this.memoryService.addMessage(
        sessionId,
        'assistant',
        summary,
        true
      );

      this.sessionService.updateSummary(sessionId, summaryMessageId);
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
