/**
 * API 模块入口
 * 
 * 此文件提供向后兼容的 apiRouter。
 * 路由注册已迁移至 register.ts（自动扫描 api/** 下所有 {action}_{module}.ts 文件）。
 * 此 Router 仅作为兜底，实际无路由挂载。
 */

import { Router } from 'express';

export const apiRouter = Router();

// 所有 API 路由由 register.ts 自动注册，无需手动导入
// 旧 *.routes.ts 文件已废弃并删除
