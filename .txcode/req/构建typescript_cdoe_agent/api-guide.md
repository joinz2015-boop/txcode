# API 层设计

## 1. API 层概述

API 层是 CLI 和 Web 共用的接口层，提供统一的接口调用方式。

---

## 2. API 目录结构

```
src/api/
├── index.ts           # API 导出
├── memory.api.ts      # 记忆 API
├── ai.api.ts          # AI API
├── session.api.ts     # 会话 API
├── context.api.ts     # 上下文 API
├── config.api.ts      # 配置 API
├── skill.api.ts       # Skill API
├── tools.api.ts       # Tools API
└── types.ts           # API 类型
```

---

## 3. API 类型定义

```typescript
// api/types.ts

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  pageSize: number;
}

export interface StreamResponse {
  type: 'chunk' | 'done' | 'error';
  data?: string;
  error?: string;
}
```

---

## 4. Memory API

```typescript
// api/memory.api.ts

import { memoryService } from '../modules/memory/memory.service';

export const memoryApi = {
  // 消息操作
  async addMessage(sessionId: string, role: 'user' | 'assistant', content: string) {
    return memoryService.addMessage(sessionId, role, content);
  },

  async getMessages(sessionId: string, limit?: number, offset?: number) {
    return memoryService.getMessages(sessionId, limit, offset);
  },

  async deleteMessage(id: number) {
    return memoryService.deleteMessage(id);
  },

  // 知识库操作
  async searchKnowledge(projectPath: string, query: string, limit?: number) {
    return memoryService.searchKnowledge(projectPath, query, limit);
  },

  async saveKnowledge(projectPath: string, key: string, value: string) {
    return memoryService.saveKnowledge(projectPath, key, value);
  },

  async deleteKnowledge(id: number) {
    return memoryService.deleteKnowledge(id);
  },

  // 代码片段操作
  async saveSnippet(sessionId: string, snippet: {
    lang: string;
    description: string;
    code: string;
    tags?: string[];
  }) {
    return memoryService.saveSnippet(sessionId, snippet);
  },

  async getSnippets(sessionId: string, limit?: number) {
    return memoryService.getSnippets(sessionId, limit);
  },

  async searchSnippets(query: string, lang?: string) {
    return memoryService.searchSnippets(query, lang);
  },
};
```

---

## 5. AI API

```typescript
// api/ai.api.ts

import { aiService } from '../modules/ai/ai.service';
import { toolsManager } from '../modules/tools/tools.manager';
import { skillManager } from '../modules/skill/skill.manager';
import { ChatMessage, ChatOptions } from '../modules/ai/ai.types';

export const aiApi = {
  async chat(
    messages: ChatMessage[],
    options?: ChatOptions & { providerId?: string; modelId?: string }
  ) {
    return aiService.chat(messages, options);
  },

  async chatStream(
    messages: ChatMessage[],
    options: ChatOptions & { providerId?: string; modelId?: string },
    callback: (chunk: { delta: string; done: boolean }) => void
  ) {
    return aiService.chatStream(messages, options, callback);
  },

  async chatWithTools(
    messages: ChatMessage[],
    options?: ChatOptions & { providerId?: string; modelId?: string }
  ) {
    return aiService.chatWithTools(messages, options);
  },

  // 获取可用工具列表
  getAvailableTools() {
    return toolsManager.getAllTools();
  },

  // 获取可用 Skills
  getAvailableSkills() {
    return skillManager.getEnabledSkills();
  },
};
```

---

## 6. Session API

```typescript
// api/session.api.ts

import { sessionService } from '../modules/session/session.service';

export const sessionApi = {
  async create(title?: string) {
    return sessionService.create(title);
  },

  async get(id: string) {
    return sessionService.get(id);
  },

  async list(limit?: number, offset?: number) {
    return sessionService.list(limit, offset);
  },

  async update(id: string, data: { title?: string }) {
    return sessionService.update(id, data);
  },

  async delete(id: string) {
    return sessionService.delete(id);
  },

  async search(query: string) {
    return sessionService.search(query);
  },
};
```

---

## 7. Config API

```typescript
// api/config.api.ts

import { configService } from '../modules/config/config.service';

export const configApi = {
  // Provider 操作
  async getProviders() {
    return configService.getProviders();
  },

  async getProvider(id: string) {
    return configService.getProvider(id);
  },

  async getDefaultProvider() {
    return configService.getDefaultProvider();
  },

  async addProvider(provider: {
    name: string;
    apiKey: string;
    baseUrl?: string;
  }) {
    return configService.addProvider(provider);
  },

  async updateProvider(id: string, data: Partial<{
    name: string;
    apiKey: string;
    baseUrl: string;
    enabled: boolean;
  }>) {
    return configService.updateProvider(id, data);
  },

  async deleteProvider(id: string) {
    return configService.deleteProvider(id);
  },

  async setDefaultProvider(id: string) {
    return configService.setDefaultProvider(id);
  },

  // Model 操作
  async getModels(providerId: string) {
    return configService.getModels(providerId);
  },

  async getAllModels() {
    return configService.getAllModels();
  },

  async addModel(providerId: string, model: {
    id: string;
    name: string;
    enabled?: boolean;
  }) {
    return configService.addModel(providerId, model);
  },

  async updateModel(id: string, data: Partial<{
    name: string;
    enabled: boolean;
  }>) {
    return configService.updateModel(id, data);
  },

  async deleteModel(id: string) {
    return configService.deleteModel(id);
  },
};
```

---

## 8. Skill API

```typescript
// api/skill.api.ts

import { skillManager } from '../modules/skill/skill.manager';

export const skillApi = {
  getAllSkills() {
    return skillManager.getAllSkills();
  },

  getEnabledSkills() {
    return skillManager.getEnabledSkills();
  },

  getSkill(id: string) {
    return skillManager.getSkill(id);
  },

  enableSkill(id: string) {
    skillManager.enableSkill(id);
  },

  disableSkill(id: string) {
    skillManager.disableSkill(id);
  },

  async reloadSkills() {
    await skillManager.loadAll();
  },
};
```

---

## 9. Web HTTP Routes

```typescript
// modules/web/web.routes.ts

import { Router } from 'express';
import { memoryApi } from '../../api/memory.api';
import { aiApi } from '../../api/ai.api';
import { sessionApi } from '../../api/session.api';
import { configApi } from '../../api/config.api';
import { skillApi } from '../../api/skill.api';

export function createRouter(): Router {
  const router = Router();

  // Session routes
  router.get('/api/sessions', async (req, res) => {
    const { limit, offset } = req.query;
    const sessions = await sessionApi.list(
      Number(limit) || 20,
      Number(offset) || 0
    );
    res.json({ success: true, data: sessions });
  });

  router.post('/api/sessions', async (req, res) => {
    const session = await sessionApi.create(req.body.title);
    res.json({ success: true, data: session });
  });

  router.get('/api/sessions/:id', async (req, res) => {
    const session = await sessionApi.get(req.params.id);
    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }
    res.json({ success: true, data: session });
  });

  router.delete('/api/sessions/:id', async (req, res) => {
    await sessionApi.delete(req.params.id);
    res.json({ success: true });
  });

  // Memory routes
  router.get('/api/sessions/:id/messages', async (req, res) => {
    const messages = await memoryApi.getMessages(req.params.id);
    res.json({ success: true, data: messages });
  });

  // Config routes
  router.get('/api/config/providers', async (req, res) => {
    const providers = await configApi.getProviders();
    res.json({ success: true, data: providers });
  });

  router.post('/api/config/providers', async (req, res) => {
    const provider = await configApi.addProvider(req.body);
    res.json({ success: true, data: provider });
  });

  router.put('/api/config/providers/:id', async (req, res) => {
    const provider = await configApi.updateProvider(req.params.id, req.body);
    res.json({ success: true, data: provider });
  });

  router.delete('/api/config/providers/:id', async (req, res) => {
    await configApi.deleteProvider(req.params.id);
    res.json({ success: true });
  });

  router.get('/api/config/models', async (req, res) => {
    const models = await configApi.getAllModels();
    res.json({ success: true, data: models });
  });

  // AI routes
  router.post('/api/ai/chat', async (req, res) => {
    const { messages, options } = req.body;
    const response = await aiApi.chat(messages, options);
    res.json({ success: true, data: response });
  });

  router.post('/api/ai/chat/stream', async (req, res) => {
    const { messages, options } = req.body;
    
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    await aiApi.chatStream(messages, { ...options, stream: true }, (chunk) => {
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
    });

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  });

  router.post('/api/ai/chatWithTools', async (req, res) => {
    const { messages, options } = req.body;
    const response = await aiApi.chatWithTools(messages, options);
    res.json({ success: true, data: response });
  });

  // Skill routes
  router.get('/api/skills', async (req, res) => {
    const skills = skillApi.getAllSkills();
    res.json({ success: true, data: skills });
  });

  router.put('/api/skills/:id/enable', async (req, res) => {
    skillApi.enableSkill(req.params.id);
    res.json({ success: true });
  });

  router.put('/api/skills/:id/disable', async (req, res) => {
    skillApi.disableSkill(req.params.id);
    res.json({ success: true });
  });

  return router;
}
```

---

## 10. React 调用示例

### 10.1 Web 端 (Vue2)

```javascript
// web/src/api/index.js

const API_BASE = 'http://localhost:40000';

export const api = {
  async request(method, path, data) {
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: data ? JSON.stringify(data) : undefined,
    });
    return res.json();
  },

  // Sessions
  getSessions() {
    return this.request('GET', '/api/sessions');
  },
  createSession(title) {
    return this.request('POST', '/api/sessions', { title });
  },

  // AI Chat
  chat(messages, options) {
    return this.request('POST', '/api/ai/chat', { messages, options });
  },
  chatStream(messages, options, onChunk) {
    const eventSource = new EventSource(`${API_BASE}/api/ai/chat/stream?messages=${encodeURIComponent(JSON.stringify(messages))}&options=${encodeURIComponent(JSON.stringify(options))}`);
    eventSource.onmessage = (e) => {
      const data = JSON.parse(e.data);
      onChunk(data);
      if (data.done) eventSource.close();
    };
  },

  // Config
  getProviders() {
    return this.request('GET', '/api/config/providers');
  },
  addProvider(provider) {
    return this.request('POST', '/api/config/providers', provider);
  },
};
```

### 10.2 CLI 端 (直接调用)

```typescript
// hooks/useAI.ts

import { aiApi } from '../api/ai.api';
import { sessionApi } from '../api/session.api';
import { memoryApi } from '../api/memory.api';
import { ChatMessage } from '../modules/ai/ai.types';

export function useAI() {
  const sendMessage = async (content: string, sessionId: string) => {
    // 添加用户消息
    await memoryApi.addMessage(sessionId, 'user', content);
    
    // 获取历史消息
    const messages = await memoryApi.getMessages(sessionId);
    
    // 调用 AI
    const response = await aiApi.chat(messages);
    
    // 保存 AI 回复
    await memoryApi.addMessage(sessionId, 'assistant', response.content);
    
    return response;
  };

  return { sendMessage };
}
```
