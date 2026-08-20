<template>
  <div class="session-bar">
    <div class="session-selector" @click="toggleDropdown">
      <span class="session-title-text">{{ currentSessionTitle || '选择会话' }}</span>
      <span class="session-chevron">&#9662;</span>
    </div>
    <button class="session-new-btn" @click="handleCreate" title="新建会话">+</button>
    <button class="session-menu-btn" @click.stop="toggleMenu" v-if="state.activeSessionId">&#8942;</button>

    <div v-if="dropdownVisible" class="session-dropdown" ref="sessionDropdown">
      <div class="session-filter-tabs">
        <button class="filter-tab" :class="{ active: state.filterMode === 'all' }" @click="state.filterMode = 'all'">全部会话</button>
        <button class="filter-tab" :class="{ active: state.filterMode === 'page' }" @click="state.filterMode = 'page'">页面会话</button>
      </div>
      <div v-if="filteredSessions.length === 0" class="session-dropdown-empty">
        {{ state.filterMode === 'page' ? '当前页面暂无会话' : '暂无会话，点击"+"创建' }}
      </div>
      <div
        v-for="s in filteredSessions"
        :key="s.id"
        class="session-dropdown-item"
        :class="{ active: s.id === state.activeSessionId }"
        @click="handleSelect(s)"
      >
        <span class="session-dropdown-title">{{ s.title }}</span>
        <span class="session-dropdown-time">{{ formatSessionTime(s.updatedAt) }}</span>
      </div>
    </div>

    <div v-if="menuVisible" class="session-menu-popup" ref="sessionMenu">
      <div class="menu-item" @click="startRename">重命名</div>
      <div class="menu-item danger" @click="confirmDelete">删除</div>
    </div>

    <div v-if="renameVisible" class="overlay" @click.self="renameVisible = false">
      <div class="dialog dialog-sm">
        <div class="dialog-header">
          <span>重命名会话</span>
          <button class="dialog-close" @click="renameVisible = false">&times;</button>
        </div>
        <div class="dialog-body">
          <input
            class="rename-input"
            v-model="renameValue"
            placeholder="请输入新名称"
            @keydown.enter="doRename"
            ref="renameInput"
          />
        </div>
        <div class="dialog-footer">
          <button class="btn-outline" @click="renameVisible = false">取消</button>
          <button class="btn-primary" @click="doRename" :disabled="!renameValue.trim()">确定</button>
        </div>
      </div>
    </div>

    <div v-if="deleteVisible" class="overlay" @click.self="deleteVisible = false">
      <div class="dialog dialog-sm">
        <div class="dialog-header">
          <span>确认删除</span>
          <button class="dialog-close" @click="deleteVisible = false">&times;</button>
        </div>
        <div class="dialog-body">
          <p class="delete-text">确定要删除会话「{{ deleteTarget ? deleteTarget.title : '' }}」吗？此操作不可恢复。</p>
        </div>
        <div class="dialog-footer">
          <button class="btn-outline" @click="deleteVisible = false">取消</button>
          <button class="btn-danger" @click="doDelete">删除</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { useSession } from './useSession.js'

export default {
  name: 'DesktopDesignSessionBar',
  props: {
    basePath: { type: String, default: '.txcode/design' }
  },
  emits: ['session-selected', 'session-created', 'session-deleted'],
  setup() {
    const { state, filteredSessions, currentSessionTitle, createNewSession,
            selectSession, renameSession, deleteSession, formatSessionTime } = useSession()
    return {
      state, filteredSessions, currentSessionTitle, createNewSession,
      selectSession, renameSession, deleteSession, formatSessionTime
    }
  },
  data() {
    return {
      dropdownVisible: false,
      menuVisible: false,
      renameVisible: false,
      renameValue: '',
      deleteVisible: false,
      deleteTarget: null,
      _clickOutside: null,
    }
  },
  mounted() {
    this.registerClickOutside()
  },
  beforeDestroy() {
    this.unregisterClickOutside()
  },
  methods: {
    toggleDropdown() {
      this.dropdownVisible = !this.dropdownVisible
      this.menuVisible = false
    },
    toggleMenu() {
      this.menuVisible = !this.menuVisible
      this.dropdownVisible = false
    },
    async handleCreate() {
      try {
        const session = await this.createNewSession(this.basePath)
        this.dropdownVisible = false
        this.$emit('session-created', session)
      } catch (e) {
        alert('创建会话失败: ' + (e.message || e))
      }
    },
    handleSelect(session) {
      this.selectSession(session, this.basePath)
      this.dropdownVisible = false
      this.menuVisible = false
      this.$emit('session-selected', session)
    },
    startRename() {
      const session = this.state.sessions.find(s => s.id === this.state.activeSessionId)
      if (!session) return
      this.renameValue = session.title
      this.menuVisible = false
      this.renameVisible = true
      this.$nextTick(() => {
        const input = this.$refs.renameInput
        if (input) input.focus()
      })
    },
    async doRename() {
      const newTitle = this.renameValue.trim()
      if (!newTitle) return
      const session = this.state.sessions.find(s => s.id === this.state.activeSessionId)
      if (session) {
        await this.renameSession(session, newTitle, this.basePath)
      }
      this.renameVisible = false
    },
    confirmDelete() {
      this.deleteTarget = this.state.sessions.find(s => s.id === this.state.activeSessionId)
      this.menuVisible = false
      this.deleteVisible = true
    },
    async doDelete() {
      if (!this.deleteTarget) return
      await this.deleteSession(this.deleteTarget, this.basePath)
      this.deleteVisible = false
      this.deleteTarget = null
      this.$emit('session-deleted')
    },
    registerClickOutside() {
      this._clickOutside = (e) => {
        if (this.dropdownVisible && this.$refs.sessionDropdown && !this.$refs.sessionDropdown.contains(e.target) && !e.target.closest('.session-selector')) {
          this.dropdownVisible = false
        }
        if (this.menuVisible && this.$refs.sessionMenu && !this.$refs.sessionMenu.contains(e.target) && !e.target.closest('.session-menu-btn')) {
          this.menuVisible = false
        }
      }
      document.addEventListener('mousedown', this._clickOutside)
    },
    unregisterClickOutside() {
      if (this._clickOutside) {
        document.removeEventListener('mousedown', this._clickOutside)
        this._clickOutside = null
      }
    },
  }
}
</script>

<style scoped>
.session-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  background: var(--bg-titlebar);
  border-bottom: 1px solid var(--border);
  position: relative;
  flex-shrink: 0;
}

.session-selector {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  padding: 5px 10px;
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  color: var(--text-primary);
  min-width: 0;
  transition: border-color 0.2s;
}
.session-selector:hover { border-color: var(--accent); }

.session-title-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
}

.session-chevron {
  font-size: 9px;
  color: var(--text-muted);
  flex-shrink: 0;
}

.session-new-btn {
  font-size: 14px;
  padding: 4px 9px;
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-family: inherit;
  white-space: nowrap;
  line-height: 1;
  transition: background 0.2s;
}
.session-new-btn:hover { background: #4752c4; }

.session-menu-btn {
  font-size: 16px;
  padding: 2px 6px;
  background: transparent;
  color: var(--text-muted);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.2s;
}
.session-menu-btn:hover { background: var(--bg-hover); color: var(--text-primary); }

.session-dropdown {
  position: absolute;
  top: 100%;
  left: 10px;
  right: 10px;
  z-index: 100;
  max-height: 320px;
  overflow-y: auto;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 6px;
  box-shadow: var(--shadow-lg);
  margin-top: 2px;
}

.session-filter-tabs {
  display: flex;
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  background: #fff;
  z-index: 1;
}

.filter-tab {
  flex: 1;
  padding: 6px 12px;
  font-size: 11px;
  background: transparent;
  color: var(--text-muted);
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.2s;
}
.filter-tab:hover { color: var(--text-primary); }
.filter-tab.active { color: var(--accent); border-bottom-color: var(--accent); }

.session-dropdown-empty {
  padding: 16px;
  text-align: center;
  font-size: 12px;
  color: var(--text-muted);
}

.session-dropdown-item {
  padding: 8px 12px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: var(--text-secondary);
  transition: background 0.15s;
}
.session-dropdown-item:hover { background: var(--bg-hover); color: var(--text-primary); }
.session-dropdown-item.active { background: var(--accent-light); color: var(--accent); }

.session-dropdown-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.session-dropdown-time {
  font-size: 10px;
  color: var(--text-muted);
  margin-left: 8px;
  flex-shrink: 0;
}

.session-menu-popup {
  position: absolute;
  top: 100%;
  right: 10px;
  z-index: 110;
  min-width: 100px;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 6px;
  box-shadow: var(--shadow-lg);
  padding: 4px;
  margin-top: 2px;
}

.session-menu-popup .menu-item {
  padding: 6px 12px;
  font-size: 12px;
  cursor: pointer;
  border-radius: 4px;
  color: var(--text-primary);
}
.session-menu-popup .menu-item:hover { background: var(--bg-hover); }
.session-menu-popup .menu-item.danger { color: var(--red); }

.overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.35); z-index: 1200;
  display: flex; align-items: center; justify-content: center;
}

.dialog-sm {
  background: #fff; border-radius: 10px; box-shadow: var(--shadow-lg);
  width: 380px; max-width: 90vw;
}
.dialog-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px; border-bottom: 1px solid var(--border);
  font-size: 14px; font-weight: 600; color: var(--text-primary);
}
.dialog-close {
  width: 24px; height: 24px; border: none; background: transparent; color: var(--text-muted);
  font-size: 18px; cursor: pointer; display: flex; align-items: center; justify-content: center;
  border-radius: 4px;
}
.dialog-close:hover { background: var(--bg-hover); }
.dialog-body { padding: 16px; }
.dialog-footer {
  display: flex; align-items: center; justify-content: flex-end; gap: 8px;
  padding: 10px 16px; border-top: 1px solid var(--border);
}

.rename-input {
  width: 100%; padding: 8px 12px; background: var(--bg-input); border: 1px solid var(--border);
  border-radius: 6px; color: var(--text-primary); font-size: 13px; outline: none; box-sizing: border-box;
}
.rename-input:focus { border-color: var(--accent); }

.delete-text {
  color: var(--text-secondary); font-size: 13px; line-height: 1.6; text-align: center; margin: 0;
}

.btn-outline {
  padding: 6px 14px; background: #fff; color: var(--text-secondary); border: 1px solid var(--border);
  border-radius: 5px; font-size: 12px; cursor: pointer; font-family: inherit;
}
.btn-primary {
  padding: 6px 14px; background: var(--accent); color: #fff; border: none; border-radius: 5px;
  font-size: 12px; cursor: pointer; font-family: inherit; font-weight: 600;
}
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-danger {
  padding: 6px 14px; background: var(--red); color: #fff; border: none; border-radius: 5px;
  font-size: 12px; cursor: pointer; font-family: inherit; font-weight: 600;
}
</style>
