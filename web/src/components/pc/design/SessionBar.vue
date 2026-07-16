<template>
  <div class="session-bar">
    <div class="session-selector" @click="toggleDropdown">
      <span class="session-title-text">{{ currentSessionTitle || '选择会话' }}</span>
      <i class="fa-solid fa-chevron-down text-xs"></i>
    </div>
    <button class="session-new-btn" @click="handleCreate" title="新建会话">+</button>
    <button class="session-menu-btn" @click.stop="toggleMenu" v-if="state.activeSessionId">⋮</button>
    <div v-if="dropdownVisible" class="session-dropdown" ref="sessionDropdown">
      <div class="session-filter-tabs">
        <button
          class="filter-tab"
          :class="{ active: state.filterMode === 'all' }"
          @click="state.filterMode = 'all'"
        >全部会话</button>
        <button
          class="filter-tab"
          :class="{ active: state.filterMode === 'page' }"
          @click="state.filterMode = 'page'"
        >页面会话</button>
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

    <RenameSessionDialog
      :visible.sync="renameVisible"
      :value="renameValue"
      @confirm="doRename"
    />

    <DeleteSessionDialog
      :visible.sync="deleteVisible"
      :title="deleteTarget ? deleteTarget.title : ''"
      @confirm="doDelete"
    />
  </div>
</template>

<script>
import { useSession } from './useSession.js'
import RenameSessionDialog from './RenameSessionDialog.vue'
import DeleteSessionDialog from './DeleteSessionDialog.vue'

export default {
  name: 'SessionBar',
  components: { RenameSessionDialog, DeleteSessionDialog },
  props: {
    basePath: { type: String, default: '.txcode/design' }
  },
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
        this.$message.error('创建会话失败: ' + (e.message || e))
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
    },
    async doRename(newTitle) {
      if (!newTitle) return
      const session = this.state.sessions.find(s => s.id === this.state.activeSessionId)
      if (session) {
        await this.renameSession(session, newTitle, this.basePath)
      }
    },
    confirmDelete() {
      this.deleteTarget = this.state.sessions.find(s => s.id === this.state.activeSessionId)
      this.menuVisible = false
      this.deleteVisible = true
    },
    doDelete() {
      if (!this.deleteTarget) return
      this.deleteSession(this.deleteTarget, this.basePath)
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
  padding: 8px 12px;
  background: #0a0a09;
  border-bottom: 1px solid #1e1e1e;
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
  background: #1a1a1a;
  border: 1px solid #2a2a2a;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  color: #d4d4d8;
  min-width: 0;
  transition: border-color 0.2s;
}
.session-selector:hover { border-color: #60a5fa; }

.session-title-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.session-new-btn {
  font-size: 14px;
  padding: 4px 9px;
  background: #60a5fa;
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-family: inherit;
  white-space: nowrap;
  line-height: 1;
  transition: background 0.2s;
}
.session-new-btn:hover { background: #818cf8; }

.session-menu-btn {
  font-size: 14px;
  padding: 4px 8px;
  background: transparent;
  color: #84848a;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.2s;
}
.session-menu-btn:hover { background: #2a2a2a; color: #d4d4d8; }

.session-dropdown {
  position: absolute;
  top: 100%;
  left: 12px;
  right: 12px;
  z-index: 100;
  max-height: 360px;
  overflow-y: auto;
  background: #1a1a1a;
  border: 1px solid #2a2a2a;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.5);
  margin-top: 2px;
}

.session-filter-tabs {
  display: flex;
  border-bottom: 1px solid #2a2a2a;
  position: sticky;
  top: 0;
  background: #1a1a1a;
  z-index: 1;
}

.filter-tab {
  flex: 1;
  padding: 6px 12px;
  font-size: 12px;
  background: transparent;
  color: #84848a;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.2s;
}
.filter-tab:hover { color: #d4d4d8; }
.filter-tab.active { color: #60a5fa; border-bottom-color: #60a5fa; }

.session-dropdown-empty {
  padding: 12px;
  text-align: center;
  font-size: 12px;
  color: #84848a;
}

.session-dropdown-item {
  padding: 8px 12px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  color: #a1a1aa;
  transition: background 0.15s;
}
.session-dropdown-item:hover { background: #252525; color: #d4d4d8; }
.session-dropdown-item.active { background: #1e3a5f; color: #60a5fa; }

.session-dropdown-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.session-dropdown-time {
  font-size: 11px;
  color: #84848a;
  margin-left: 8px;
  flex-shrink: 0;
}

.session-menu-popup {
  position: absolute;
  top: 100%;
  right: 12px;
  z-index: 110;
  min-width: 100px;
  background: #1a1a1a;
  border: 1px solid #2a2a2a;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.5);
  padding: 4px;
  margin-top: 2px;
}

.session-menu-popup .menu-item {
  padding: 6px 12px;
  font-size: 12px;
  cursor: pointer;
  border-radius: 4px;
  color: #d4d4d8;
}
.session-menu-popup .menu-item:hover { background: #252525; }
.session-menu-popup .menu-item.danger { color: #ef4444; }
</style>
