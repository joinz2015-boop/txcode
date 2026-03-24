<template>
  <div class="flex flex-col h-screen overflow-hidden">
    <header class="h-10 bg-sidebar border-b border-black flex items-center justify-between px-4 shrink-0 z-20">
      <div class="flex items-center gap-4">
        <div class="font-bold text-white flex items-center gap-2">
          <i class="fa-solid fa-robot text-accent"></i>
          <span>TXCode Agent</span>
        </div>
        <div class="relative">
          <div @click="toggleSessionDropdown" class="bg-black/20 px-2 py-0.5 rounded text-xs text-textMuted border border-white/10 cursor-pointer hover:bg-black/40 flex items-center gap-2 select-none">
            <i class="fa-solid fa-comment"></i> <span>{{ currentSessionName || '选择会话' }}</span> <i class="fa-solid fa-chevron-down text-[10px] transition-transform" :class="{ 'rotate-180': showSessionDropdown }"></i>
          </div>
          <div v-show="showSessionDropdown" class="absolute top-full left-0 mt-1 w-56 bg-sidebar border border-border rounded shadow-lg py-1 z-50">
            <div class="px-3 py-1.5 text-xs text-textMuted uppercase font-bold">最近会话</div>
            <button v-for="session in sessions" :key="session.id" @click="switchSession(session)" class="w-full text-left px-3 py-2 text-sm hover:bg-active flex items-center gap-2" :class="session.id === currentSessionId ? 'text-white bg-active' : 'text-textMuted hover:text-white'">
              <i class="fa-regular fa-comment text-xs"></i> {{ session.title }}
            </button>
            <div class="border-t border-border my-1"></div>
            <button @click="createNewSession" class="w-full text-left px-3 py-2 text-sm text-textMuted hover:bg-active hover:text-white flex items-center gap-2">
              <i class="fa-solid fa-plus text-xs"></i> 新建会话...
            </button>
          </div>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <span class="text-xs text-textMuted mr-2"><i class="fa-solid fa-circle text-green-500 text-[8px]"></i> Server Connected</span>
        <button v-show="$route.name === 'chat'" @click="toggleSidebar" class="hover:text-white" :title="sidebarVisible ? '关闭侧栏' : '显示侧栏'"><i class="fa-solid fa-columns"></i></button>
        <router-link to="/settings" class="hover:text-white" title="设置"><i class="fa-solid fa-gear"></i></router-link>
      </div>
    </header>

    <div class="flex-1 flex overflow-hidden">
      <nav class="w-12 bg-activityBar flex flex-col items-center py-2 shrink-0 border-r border-black z-10 justify-between">
        <div class="flex flex-col items-center w-full">
          <router-link to="/chat" class="w-10 h-10 mb-2 rounded flex items-center justify-center relative" :class="$route.name === 'chat' || $route.name === 'chat-session' ? 'text-white border-l-2 border-accent bg-sidebar' : 'text-textMuted hover:text-white border-l-2 border-transparent'" title="工作台">
            <i class="fa-regular fa-comments text-xl"></i>
          </router-link>
          <router-link to="/files" class="w-10 h-10 mb-2 rounded flex items-center justify-center" :class="$route.name === 'files' ? 'text-white border-l-2 border-accent bg-sidebar' : 'text-textMuted hover:text-white border-l-2 border-transparent'" title="文件">
            <i class="fa-solid fa-folder-open text-xl"></i>
          </router-link>
          <router-link to="/skills" class="w-10 h-10 mb-2 rounded flex items-center justify-center relative" :class="$route.name === 'skills' ? 'text-white border-l-2 border-accent bg-sidebar' : 'text-textMuted hover:text-white border-l-2 border-transparent'" title="Skill 管理">
            <i class="fa-solid fa-shapes text-xl"></i>
          </router-link>
          <router-link to="/db" class="w-10 h-10 mb-2 rounded flex items-center justify-center" :class="$route.name === 'db' ? 'text-white border-l-2 border-accent bg-sidebar' : 'text-textMuted hover:text-white border-l-2 border-transparent'" title="数据库">
            <i class="fa-solid fa-database text-xl"></i>
          </router-link>
        </div>
        <div class="flex flex-col items-center w-full mb-2">
          <router-link to="/settings" class="w-10 h-10 mb-2 rounded flex items-center justify-center" :class="$route.name === 'settings' ? 'text-white border-l-2 border-accent bg-sidebar' : 'text-textMuted hover:text-white border-l-2 border-transparent hover:bg-white/5'" title="设置">
            <i class="fa-solid fa-gear text-xl"></i>
          </router-link>
        </div>
      </nav>

      <router-view class="flex-1 flex overflow-hidden" :sidebar-visible="sidebarVisible" @toggle-sidebar="toggleSidebar" />
    </div>

    <footer class="h-6 bg-accent text-white text-xs flex items-center justify-between px-3 shrink-0 z-20">
      <div class="flex items-center gap-4">
        <span><i class="fa-solid fa-code-branch"></i> main</span>
      </div>
      <div class="flex items-center gap-4">
        <span>TXCode</span>
        <span>UTF-8</span>
      </div>
    </footer>
  </div>
</template>

<script>
import { api } from '../api'

export default {
  name: 'Layout',
  data() {
    return {
      sidebarVisible: true,
      showSessionDropdown: false,
      sessions: [],
      currentSessionId: null,
      currentSessionName: ''
    }
  },
  methods: {
    toggleSidebar() {
      this.sidebarVisible = !this.sidebarVisible
    },
    toggleSessionDropdown() {
      this.showSessionDropdown = !this.showSessionDropdown
    },
    async switchSession(session) {
      this.currentSessionId = session.id
      this.currentSessionName = session.title
      this.showSessionDropdown = false
      if (this.$route.params.id !== session.id) {
        this.$router.push({ name: 'chat-session', params: { id: session.id } }).catch(() => {})
      }
    },
    async createNewSession() {
      try {
        const res = await api.createSession('新会话')
        this.sessions.unshift(res.data)
        this.switchSession(res.data)
        this.showSessionDropdown = false
      } catch (e) {
        this.$message.error('创建会话失败: ' + e.message)
      }
    },
    async loadSessions() {
      try {
        const res = await api.getSessions()
        this.sessions = res.data || []
        if (this.sessions.length > 0 && !this.currentSessionId) {
          this.currentSessionId = this.sessions[0].id
          this.currentSessionName = this.sessions[0].title
        }
      } catch (e) {
        console.error('加载会话失败:', e)
      }
    }
  },
  async created() {
    await this.loadSessions()
    document.addEventListener('click', (e) => {
      if (!this.$el.contains(e.target)) {
        this.showSessionDropdown = false
      }
    })
  }
}
</script>
