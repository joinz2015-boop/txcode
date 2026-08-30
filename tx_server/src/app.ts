/**
 * 应用全局信息配置
 *
 * 发包时版本号维护：
 * - 推荐方案：只改根 package.json 的 version（本文件自动读取，单一数据源）
 * - 若改回硬编码：version 与根 package.json 同步修改
 */
import { getVersion } from './utils/version.js';

export const appInfo = {
  /** 系统名称 */
  name: 'txcode',
  /** 版本号（动态读取根 package.json，发包时无需修改本文件） */
  version: getVersion(),
  /** 作者 */
  author: 'txcode Team',
  /** 官网地址 */
  website: 'https://txcode.homecommunity.cn',
  /** 版权信息 */
  copyright: 'Copyright © 2026 txcode',
  /** 系统描述 */
  description: 'AI Coding Assistant',
};

export type AppInfo = typeof appInfo;
