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

    const messages = this.memoryService.getAllMessages(sessionId);
    if (messages.length === 0) {
      return {
        success: false,
        summary: '',
        tokensBefore: 0,
        tokensAfter: 0,
        error: 'No messages to compact',
      };
    }

    const tokensBefore = session.promptTokens + session.completionTokens;

    onProgress?.('Generating summary...');

    try {
      const chatMessages = messages.map(m => ({
        role: m.role,
        content: m.content,
      }));

      const summarizerMessages = buildSummarizerMessages(chatMessages);

      const provider = this.getProvider();
      const response = await provider.chat(summarizerMessages, {
        maxTokens: 2000,
      });

      const summary = response.content?.trim() || '';

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

      const summaryMessageId = this.memoryService.addMessage(
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
        tokensBefore,
        tokensAfter: 0,
      };
    } catch (error) {
      return {
        success: false,
        summary: '',
        tokensBefore,
        tokensAfter: tokensBefore,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  checkNeedsCompact(sessionId: string): CompactionCheckResult {
    const session = this.sessionService.get(sessionId);
    if (!session) {
      return { needed: false, reason: 'Session not found', totalTokens: 0, threshold: 0 };
    }

    const config = this.getContextConfig();
    const model = this.getCurrentModel();

    let threshold: number;
    if (config.mode === 'percentage' && model?.contextWindow) {
      threshold = Math.floor(model.contextWindow * config.percentage);
    } else {
      threshold = config.maxTokens;
    }

    const totalTokens = session.promptTokens + session.completionTokens;

    if (!config.autoCompact) {
      return { needed: false, reason: 'Auto compact disabled', totalTokens, threshold };
    }

    if (totalTokens < threshold) {
      return {
        needed: false,
        reason: `Tokens (${totalTokens}) below threshold (${threshold})`,
        totalTokens,
        threshold,
      };
    }

    return {
      needed: true,
      reason: `Tokens (${totalTokens}) exceeded threshold (${threshold})`,
      totalTokens,
      threshold,
    };
  }
}
