<template>
  <div class="plan-panel">
    <div class="plan-mode-wrap">
      <DesktopPlanEditor
        :content="planContent"
        :filePath="planFilePath"
        :editorFlex="editorFlex"
        @update:content="planContent = $event"
        @refresh="refreshPlan"
        @export="exportPlan"
        @create-sub="createSubPlan"
      />
      <div
        class="resize-handle-plan"
        @mousedown="startResize"
        :class="{ active: resizing }"
      ></div>
      <DesktopAssistantPanel :panelWidth="assistantWidth" />
    </div>
  </div>
</template>

<script>
import DesktopPlanEditor from './DesktopPlanEditor.vue'
import DesktopAssistantPanel from './DesktopAssistantPanel.vue'
import { getItem, setItem } from '@/utils/storage'

const demoContent = `# txcode 方案设计文档

## 概述
txcode 是一个 AI 编程助手 CLI 工具，提供 CLI (Ink/React TUI) 与 Web (Vue2 + Vite) 双模式，集成 13 个 AI Agent。

## 架构设计
- **网关层**：CLI 参数解析 + Ink UI 组件 / Express REST API + WebSocket
- **核心层**：AI Agent（13个）、Function Calling 工具（15个）、LSP 语言服务、SQLite WASM
- **服务层**：业务逻辑编排、会话管理、定时任务、队列系统

## 技术栈
- TypeScript 5.9 · ESM 模块系统
- Vue2 + Vite + Tailwind v4 + Element UI
- sql.js (SQLite WASM)
- Monaco Editor + xterm.js
- Ink/React (CLI TUI)

## 实施计划
1. 搭建基础框架与项目结构
2. 实现 AI 对话与 Agent 调度机制
3. 集成 Function Calling 工具调用
4. 添加 Plan-Code 双模式开发方案
5. 完善 LSP 语言服务与终端集成
6. 实现会话管理与记忆系统`

export default {
  name: 'DesktopPlanPanel',
  components: { DesktopPlanEditor, DesktopAssistantPanel },
  props: {
    currentSession: { type: Object, default: null }
  },
  data() {
    return {
      planContent: demoContent,
      assistantWidth: 370,
      resizing: false,
      startX: 0,
      startW: 0
    }
  },
  computed: {
    planFilePath() {
      return this.currentSession
        ? this.currentSession.name + '.md'
        : '方案文档.md'
    },
    editorFlex() {
      return '1'
    }
  },
  methods: {
    open(data) {
      if (data && data.session) {
        // handle session data
      }
    },
    refreshPlan() {
      console.log('Plan refreshed')
    },
    exportPlan() {
      console.log('Plan exported')
    },
    createSubPlan() {
      console.log('Sub-plan created')
    },
    startResize(e) {
      this.resizing = true
      this.startX = e.clientX
      this.startW = this.assistantWidth
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
      const move = (ev) => {
        const newW = Math.max(260, Math.min(600, this.startW + (this.startX - ev.clientX)))
        this.assistantWidth = newW
      }
      const up = () => {
        this.resizing = false
        document.removeEventListener('mousemove', move)
        document.removeEventListener('mouseup', up)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }
      document.addEventListener('mousemove', move)
      document.addEventListener('mouseup', up)
    }
  }
}
</script>

<style scoped>
.plan-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.plan-mode-wrap {
  flex: 1;
  display: flex;
  overflow: hidden;
  padding: 14px;
  gap: 0;
}
.resize-handle-plan {
  width: 5px;
  cursor: col-resize;
  flex-shrink: 0;
  transition: background 0.15s;
  border-radius: 2px;
}
.resize-handle-plan:hover,
.resize-handle-plan.active {
  background: var(--accent);
  opacity: 0.5;
}
</style>
