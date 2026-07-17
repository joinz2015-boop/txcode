<template>
  <div class="overlay" @click.self="$emit('close')">
    <div class="dialog">
      <div class="dialog-header">
        <span>命令面板</span>
        <button class="dialog-close" @click="$emit('close')">&times;</button>
      </div>
      <div class="dialog-body">
        <div class="command-list">
          <div v-for="cmd in commands" :key="cmd.name" class="command-item" @click="selectCommand(cmd)">
            <span class="cmd-icon">{{ cmd.icon || '>' }}</span>
            <div class="cmd-info">
              <div class="cmd-name">{{ cmd.name }}</div>
              <div class="cmd-desc" v-if="cmd.description">{{ cmd.description }}</div>
            </div>
          </div>
        </div>
      </div>
      <div class="dialog-footer">
        <button class="btn-outline" @click="$emit('close')">取消</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'DesktopCommandDialog',
  emits: ['close', 'select'],
  data() {
    return {
      commands: [
        { name: '/clear', icon: '🗑', description: '清空当前对话' },
        { name: '/help', icon: '?', description: '显示帮助信息' },
        { name: '/compact', icon: '📦', description: '压缩对话历史' },
        { name: '/model', icon: '🤖', description: '切换 AI 模型' },
        { name: '/file', icon: '📄', description: '查看文件' },
        { name: '/git', icon: '🔀', description: '查看 git 状态' },
        { name: '/test', icon: '🧪', description: '运行测试' }
      ]
    }
  },
  methods: {
    selectCommand(cmd) {
      this.$emit('select', cmd.name)
      this.$emit('close')
    }
  }
}
</script>

<style scoped>
.overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.35); z-index: 1100;
  display: flex; align-items: center; justify-content: center;
}
.dialog {
  background: #fff; border-radius: 10px; box-shadow: 0 8px 30px rgba(0,0,0,0.15);
  width: 400px; max-width: 90vw; max-height: 65vh; display: flex; flex-direction: column;
}
.dialog-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px; border-bottom: 1px solid var(--border);
  font-size: 14px; font-weight: 600; color: var(--text-primary);
}
.dialog-close {
  width: 24px; height: 24px; border: none; background: transparent; color: var(--text-muted);
  font-size: 18px; cursor: pointer; display: flex; align-items: center; justify-content: center;
}
.dialog-close:hover { background: var(--bg-hover); }
.dialog-body { flex: 1; overflow-y: auto; padding: 8px; }
.command-item {
  display: flex; align-items: flex-start; gap: 10px; padding: 10px 12px; border-radius: 6px;
  cursor: pointer; transition: background 0.1s; margin-bottom: 2px;
}
.command-item:hover { background: var(--bg-hover); }
.cmd-icon { font-size: 16px; flex-shrink: 0; width: 22px; text-align: center; }
.cmd-info { flex: 1; min-width: 0; }
.cmd-name { font-size: 13px; font-weight: 600; color: var(--text-primary); font-family: monospace; }
.cmd-desc { font-size: 11px; color: var(--text-muted); margin-top: 2px; }
.dialog-footer {
  display: flex; align-items: center; justify-content: flex-end; gap: 8px;
  padding: 10px 16px; border-top: 1px solid var(--border);
}
.btn-outline {
  padding: 6px 14px; background: #fff; color: var(--text-secondary); border: 1px solid var(--border);
  border-radius: 5px; font-size: 12px; cursor: pointer; font-family: inherit;
}
</style>
