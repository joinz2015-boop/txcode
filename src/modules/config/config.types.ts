/**
 * Config 模块类型定义
 * 
 * Provider: AI 服务商配置
 * Model: 模型配置
 */

export interface Provider {
  /** 服务商 ID */
  id: string;
  /** 服务商名称 */
  name: string;
  /** API Key */
  apiKey: string;
  /** API 基础 URL */
  baseUrl: string;
  /** 是否启用 */
  enabled: boolean;
  /** 是否为默认 */
  isDefault: boolean;
}

export interface Model {
  /** 模型 ID */
  id: string;
  /** 所属服务商 ID */
  providerId: string;
  /** 模型名称 */
  name: string;
  /** 是否启用 */
  enabled: boolean;
}