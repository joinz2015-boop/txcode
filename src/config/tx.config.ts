/**
 * TxCode 全局配置文件
 * 此文件定义了 TxCode 项目的全局配置接口和默认配置
 * 主要用于控制应用程序的基本行为，如调试模式和日志记录
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { TxConfig } from '../entity/tx-config.entity.js';
export type { ContextConfig, TxConfig } from '../entity/tx-config.entity.js';

function getUserConfigPath(): string {
  const home = os.homedir();
  return path.join(home, '.txcode', 'txcode.json');
}

function loadUserConfig(): Partial<TxConfig> | null {
  const configPath = getUserConfigPath();
  if (!fs.existsSync(configPath)) return null;
  try {
    const raw = fs.readFileSync(configPath, 'utf-8');
    return JSON.parse(raw) as Partial<TxConfig>;
  } catch {
    return null;
  }
}

/**
 * TxCode 默认配置
 * 这是应用程序的默认配置，可以在运行时通过其他方式覆盖
 */
const defaults: TxConfig = {
  debug: false,

  log: {
    enabled: false,
    dir: 'log',
    accessLog: 'access.log',
  },

  maxToolIterations: 50,

  ai: {
    context: {
      mode: 'fixed',
      maxTokens: 150000,
      percentage: 0.95,
      autoCompact: true,
    },
  },

  songbing: {
    platformUrl: 'https://ai.songbingcloud.com',
  },
};

const userConfig = loadUserConfig();

const config: TxConfig = {
  debug: defaults.debug,
  log: {
    enabled: userConfig?.log?.enabled ?? defaults.log.enabled,
    dir: defaults.log.dir,
    accessLog: defaults.log.accessLog,
  },
  maxToolIterations: userConfig?.maxToolIterations ?? defaults.maxToolIterations,
  ai: {
    context: {
      mode: defaults.ai.context.mode,
      maxTokens: userConfig?.ai?.context?.maxTokens ?? defaults.ai.context.maxTokens,
      percentage: defaults.ai.context.percentage,
      autoCompact: defaults.ai.context.autoCompact,
    },
  },
  songbing: defaults.songbing,
};

export default config;

export function getSongbingApiBaseUrl(): string {
  return config.songbing?.platformUrl + '/api/v1';
}
