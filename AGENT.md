# AGENT.md

## 项目概述

txcode 是一个 AI 编程助手命令行工具，支持交互式 CLI 和 Web 界面。

## 技术栈

- TypeScript + Node.js
- Express (Web 服务)
- React + Ink (CLI UI)
- better-sqlite3 (数据存储)
- OpenAI API (AI 能力)

## 开发命令

```bash
npm run dev        # 开发模式运行 CLI
npm run start      # 运行构建后的 CLI
npm run start:web  # 启动 Web 服务
npm run web:dev    # 开发 Web 前端
npm run build      # 构建项目
npm test           # 运行测试
```

## 测试框架

Jest (参见 jest.config.mjs)

## 关键目录

- `src/` - 源代码
- `dist/` - 构建输出
- `tests/` - 测试文件
- `web/` - Web 前端
- `.txcode/` - 运行时数据（记忆、会话）