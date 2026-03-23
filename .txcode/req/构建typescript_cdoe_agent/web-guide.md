# Web 模块设计

## 1. Web 概述

Web 模块提供基于 Vue2 + ElementUI 的配置管理页面和会话管理界面。

---

## 2. 目录结构

```
web/
├── src/
│   ├── main.js
│   ├── App.vue
│   ├── api/
│   │   └── index.js          # API 调用封装
│   ├── views/
│   │   ├── Chat.vue          # 聊天页面
│   │   ├── Sessions.vue      # 会话列表
│   │   └── Settings.vue      # 配置页面
│   ├── components/
│   │   ├── Header.vue
│   │   ├── MessageList.vue
│   │   ├── MessageItem.vue
│   │   ├── ChatInput.vue
│   │   └── ProviderForm.vue
│   └── router/
│       └── index.js
├── public/
│   └── index.html
├── package.json
└── vite.config.js
```

---

## 3. Web 服务入口

```typescript
// modules/web/web.service.ts

import express from 'express';
import * as path from 'path';
import { createRouter } from './web.routes';

export class WebService {
  private app: express.Application;
  private port: number;

  constructor(port = 40000) {
    this.port = port;
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware() {
    this.app.use(express.json());
    this.app.use(express.static(path.join(__dirname, '../../web/dist')));
  }

  private setupRoutes() {
    const router = createRouter();
    this.app.use('/api', router);
    
    // SPA 路由
    this.app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, '../../web/dist/index.html'));
    });
  }

  start(): Promise<void> {
    return new Promise((resolve) => {
      this.app.listen(this.port, () => {
        console.log(`Web 服务已启动: http://localhost:${this.port}`);
        resolve();
      });
    });
  }
}
```

---

## 4. Web 路由

```typescript
// modules/web/web.routes.ts

import { Router } from 'express';
import { sessionApi } from '../../api/session.api';
import { memoryApi } from '../../api/memory.api';
import { configApi } from '../../api/config.api';
import { aiApi } from '../../api/ai.api';
import { skillApi } from '../../api/skill.api';

export function createRouter(): Router {
  const router = Router();

  // Session 路由
  router.get('/sessions', async (req, res) => {
    try {
      const { limit = 20, offset = 0 } = req.query;
      const sessions = await sessionApi.list(Number(limit), Number(offset));
      res.json({ success: true, data: sessions });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  router.post('/sessions', async (req, res) => {
    try {
      const { title, projectPath } = req.body;
      const session = await sessionApi.create(title, projectPath);
      res.json({ success: true, data: session });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  router.get('/sessions/:id', async (req, res) => {
    try {
      const session = await sessionApi.get(req.params.id);
      if (!session) {
        return res.status(404).json({ success: false, error: 'Session not found' });
      }
      res.json({ success: true, data: session });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  router.delete('/sessions/:id', async (req, res) => {
    try {
      await sessionApi.delete(req.params.id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  router.get('/sessions/:id/messages', async (req, res) => {
    try {
      const messages = await memoryApi.getMessages(req.params.id);
      res.json({ success: true, data: messages });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // Config 路由
  router.get('/config/providers', async (req, res) => {
    try {
      const providers = await configApi.getProviders();
      res.json({ success: true, data: providers });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  router.post('/config/providers', async (req, res) => {
    try {
      const provider = await configApi.addProvider(req.body);
      res.json({ success: true, data: provider });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  router.put('/config/providers/:id', async (req, res) => {
    try {
      const provider = await configApi.updateProvider(req.params.id, req.body);
      res.json({ success: true, data: provider });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  router.delete('/config/providers/:id', async (req, res) => {
    try {
      await configApi.deleteProvider(req.params.id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  router.get('/config/models', async (req, res) => {
    try {
      const models = await configApi.getAllModels();
      res.json({ success: true, data: models });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // AI 路由
  router.post('/ai/chat', async (req, res) => {
    try {
      const { messages, options } = req.body;
      const response = await aiApi.chat(messages, options);
      res.json({ success: true, data: response });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  router.post('/ai/chat/stream', async (req, res) => {
    try {
      const { messages, options } = req.body;
      
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      await aiApi.chatStream(messages, { ...options, stream: true }, (chunk) => {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      });

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // Skills 路由
  router.get('/skills', async (req, res) => {
    try {
      const skills = skillApi.getAllSkills();
      res.json({ success: true, data: skills });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  return router;
}
```

---

## 5. Vue 页面设计

### 5.1 主页面 App.vue

```vue
<template>
  <div id="app">
    <el-container>
      <el-header height="60px">
        <Header 
          :session="currentSession"
          @new-session="createSession"
          @open-settings="settingsVisible = true"
        />
      </el-header>
      
      <el-container>
        <el-aside width="250px" v-if="$route.name === 'chat'">
          <SessionsSidebar 
            :sessions="sessions"
            :current-session-id="currentSession?.id"
            @select="selectSession"
            @delete="deleteSession"
          />
        </el-aside>
        
        <el-main>
          <router-view />
        </el-main>
      </el-container>
    </el-container>

    <SettingsDialog 
      :visible="settingsVisible"
      @close="settingsVisible = false"
    />
  </div>
</template>

<script>
export default {
  data() {
    return {
      sessions: [],
      currentSession: null,
      settingsVisible: false,
    };
  },
  
  methods: {
    async loadSessions() {
      const res = await this.$api.getSessions();
      this.sessions = res.data;
    },
    
    async createSession() {
      const res = await this.$api.createSession();
      this.sessions.unshift(res.data);
      this.selectSession(res.data);
    },
    
    selectSession(session) {
      this.currentSession = session;
      this.$router.push({ name: 'chat', params: { id: session.id } });
    },
    
    async deleteSession(id) {
      await this.$api.deleteSession(id);
      this.sessions = this.sessions.filter(s => s.id !== id);
      if (this.currentSession?.id === id) {
        this.currentSession = this.sessions[0] || null;
      }
    },
  },
};
</script>
```

### 5.2 Chat.vue

```vue
<template>
  <div class="chat-container">
    <MessageList 
      :messages="messages"
      :loading="loading"
    />
    
    <ChatInput 
      @send="sendMessage"
      :disabled="loading"
    />
  </div>
</template>

<script>
export default {
  data() {
    return {
      messages: [],
      loading: false,
    };
  },
  
  methods: {
    async loadMessages() {
      const sessionId = this.$route.params.id;
      const res = await this.$api.getMessages(sessionId);
      this.messages = res.data;
    },
    
    async sendMessage(content) {
      if (!content.trim() || this.loading) return;
      
      this.loading = true;
      
      // 添加用户消息
      this.messages.push({
        role: 'user',
        content,
      });
      
      try {
        await this.$api.chatStream(
          { sessionId: this.$route.params.id, messages: this.messages },
          (chunk) => {
            // 处理流式响应
          }
        );
      } finally {
        this.loading = false;
      }
    },
  },
};
</script>

<style scoped>
.chat-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}
</style>
```

### 5.3 Settings.vue

```vue
<template>
  <el-dialog
    title="设置"
    :visible="visible"
    width="800px"
    @close="$emit('close')"
  >
    <el-tabs>
      <el-tab-pane label="AI 服务商">
        <ProviderList :providers="providers" @refresh="loadProviders" />
      </el-tab-pane>
      
      <el-tab-pane label="模型">
        <ModelList :models="models" @refresh="loadModels" />
      </el-tab-pane>
      
      <el-tab-pane label="Skills">
        <SkillsList :skills="skills" />
      </el-tab-pane>
      
      <el-tab-pane label="高级">
        <el-form label-width="150px">
          <el-form-item label="最大工具轮数">
            <el-input-number 
              v-model="config.maxToolIterations"
              :min="1"
              :max="100"
            />
          </el-form-item>
          
          <el-form-item label="会话压缩">
            <el-input-number 
              v-model="config.maxSessionCompression"
              :min="1"
              :max="100"
            />
          </el-form-item>
        </el-form>
      </el-tab-pane>
    </el-tabs>
  </el-dialog>
</template>

<script>
export default {
  props: ['visible'],
  
  data() {
    return {
      providers: [],
      models: [],
      skills: [],
      config: {
        maxToolIterations: 10,
        maxSessionCompression: 5,
      },
    };
  },
  
  methods: {
    async loadProviders() {
      const res = await this.$api.getProviders();
      this.providers = res.data;
    },
    
    async loadModels() {
      const res = await this.$api.getModels();
      this.models = res.data;
    },
    
    async loadSkills() {
      const res = await this.$api.getSkills();
      this.skills = res.data;
    },
  },
};
</script>
```

### 5.4 ProviderForm.vue

```vue
<template>
  <el-form :model="form" :rules="rules" ref="form" label-width="100px">
    <el-form-item label="名称" prop="name">
      <el-input v-model="form.name" placeholder="OpenAI" />
    </el-form-item>
    
    <el-form-item label="API Key" prop="apiKey">
      <el-input 
        v-model="form.apiKey" 
        type="password"
        show-password
        placeholder="sk-..." 
      />
    </el-form-item>
    
    <el-form-item label="Base URL" prop="baseUrl">
      <el-input 
        v-model="form.baseUrl" 
        placeholder="https://api.openai.com/v1"
      />
    </el-form-item>
    
    <el-form-item>
      <el-button type="primary" @click="submit">保存</el-button>
      <el-button @click="$emit('cancel')">取消</el-button>
    </el-form-item>
  </el-form>
</template>

<script>
export default {
  data() {
    return {
      form: {
        name: '',
        apiKey: '',
        baseUrl: 'https://api.openai.com/v1',
      },
      rules: {
        name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
        apiKey: [{ required: true, message: '请输入 API Key', trigger: 'blur' }],
      },
    };
  },
  
  methods: {
    async submit() {
      const valid = await this.$refs.form.validate().catch(() => false);
      if (!valid) return;
      
      await this.$api.addProvider(this.form);
      this.$emit('success');
      this.$emit('cancel');
    },
  },
};
</script>
```

---

## 6. API 封装

```javascript
// web/src/api/index.js

const API_BASE = 'http://localhost:40000/api';

async function request(method, path, data) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: data ? JSON.stringify(data) : undefined,
  });
  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error || 'Request failed');
  }
  return json;
}

export const api = {
  // Sessions
  getSessions(limit = 20, offset = 0) {
    return request('GET', `/sessions?limit=${limit}&offset=${offset}`);
  },
  
  createSession(title, projectPath) {
    return request('POST', '/sessions', { title, projectPath });
  },
  
  getSession(id) {
    return request('GET', `/sessions/${id}`);
  },
  
  deleteSession(id) {
    return request('DELETE', `/sessions/${id}`);
  },
  
  getMessages(sessionId) {
    return request('GET', `/sessions/${sessionId}/messages`);
  },

  // Providers
  getProviders() {
    return request('GET', '/config/providers');
  },
  
  addProvider(provider) {
    return request('POST', '/config/providers', provider);
  },
  
  updateProvider(id, data) {
    return request('PUT', `/config/providers/${id}`, data);
  },
  
  deleteProvider(id) {
    return request('DELETE', `/config/providers/${id}`);
  },
  
  setDefaultProvider(id) {
    return request('POST', `/config/providers/${id}/default`);
  },

  // Models
  getModels() {
    return request('GET', '/config/models');
  },

  // AI Chat
  chat(data) {
    return request('POST', '/ai/chat', data);
  },
  
  chatStream(data, onChunk) {
    const es = new EventSource(`${API_BASE}/ai/chat/stream?` + 
      `data=${encodeURIComponent(JSON.stringify(data))}`);
    
    es.onmessage = (e) => {
      const chunk = JSON.parse(e.data);
      onChunk(chunk);
      if (chunk.done) es.close();
    };
    
    es.onerror = () => es.close();
  },

  // Skills
  getSkills() {
    return request('GET', '/skills');
  },
};
```

---

## 7. Web 页面流程图

```
┌─────────────────────────────────────────────────────────────┐
│                      Web 页面结构                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Header: Logo | 当前会话 | 新建会话 | 设置          │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌──────────┬──────────────────────────────────────────┐   │
│  │ Sessions │                                          │   │
│  │ Sidebar │           Chat Area                      │   │
│  │          │                                          │   │
│  │ • 会话1  │  ┌────────────────────────────────────┐  │   │
│  │ • 会话2  │  │         Message List              │  │   │
│  │ • 会话3  │  │                                    │  │   │
│  │          │  │  用户消息                          │  │   │
│  │          │  │  AI 回复                          │  │   │
│  │          │  │                                    │  │   │
│  │          │  └────────────────────────────────────┘  │   │
│  │          │                                          │   │
│  │          │  ┌────────────────────────────────────┐  │   │
│  │          │  │         ChatInput                  │  │   │
│  │          │  └────────────────────────────────────┘  │   │
│  └──────────┴──────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    Settings Dialog                           │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐   │
│  │  [AI 服务商] [模型] [Skills] [高级]                 │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │                                                     │   │
│  │  服务商列表                                         │   │
│  │  ┌─────────────────────────────────────────────┐   │   │
│  │  │ OpenAI (默认) [编辑] [删除]                 │   │   │
│  │  │ 硅基流动 [编辑] [删除]                       │   │   │
│  │  └─────────────────────────────────────────────┘   │   │
│  │                                                     │   │
│  │  [+ 添加服务商]                                    │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 8. 启动流程

```typescript
// main.ts

import { WebService } from '../modules/web/web.service';
import { sessionService } from '../modules/session/session.service';
import { memoryService } from '../modules/memory/memory.service';
import { skillsLoader } from '../modules/ai/skills/skills.loader';
import { toolsManager } from '../modules/ai/tools/tools.manager';
import { dbService } from '../modules/db/db.service';

async function main() {
  // 初始化数据库
  dbService.init();
  
  // 初始化模块
  await skillsLoader.loadAll();
  toolsManager.registerBuiltinTools();
  
  // 启动 Web 服务
  const port = parseInt(process.env.PORT || '40000');
  const webService = new WebService(port);
  await webService.start();
}

main().catch(console.error);
```
