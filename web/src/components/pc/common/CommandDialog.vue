<template>
  <el-dialog
    :visible="visible"
    title="命令"
    width="500px"
    :close-on-click-modal="false"
    @update:visible="handleVisibleChange"
    @close="handleClose"
  >
    <div class="command-list">
      <div
        v-for="cmd in commands"
        :key="cmd.name"
        class="command-item"
        :class="{ selected: selectedCommand === cmd.name }"
        @click="selectedCommand = cmd.name"
        @dblclick="handleExecute(cmd)"
        :title="'双击执行: ' + cmd.name"
      >
        <span class="command-name">{{ cmd.name }}</span>
        <span class="command-desc">{{ cmd.description }}</span>
      </div>
      <div v-if="loading" class="empty-commands">
        <i class="fa-solid fa-spinner fa-spin mr-2"></i> 加载中...
      </div>
    </div>
  </el-dialog>
</template>

<script>
export default {
  name: 'CommandDialog',
  props: {
    visible: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      loading: false,
      selectedCommand: '',
      commands: [
        { name: '/compact', description: '压缩当前会话上下文' }
      ]
    }
  },
  methods: {
    open() {
      // 无需加载，直接打开
    },
    handleExecute(cmd) {
        this.$emit('execute', cmd.name)
        this.$emit('update:visible', false)
    },
    handleClose() {
      this.$emit('close')
    },
    handleVisibleChange(val) {
      this.$emit('update:visible', val)
    }
  }
}
</script>

<style scoped>
.command-list {
  max-height: 400px;
  overflow-y: auto;
}
.command-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.2s;
}

.command-item:hover {
  background: #27272a;
}

.command-item.selected {
  background: #3b3f46;
}

.command-item:active {
  background: #3b3f46;
}

.command-name {
  color: #60a5fa;
  font-weight: 500;
  font-family: ui-monospace, SFMono-Regular, "JetBrains Mono", monospace;
}

.command-desc {
  color: #84848a;
  font-size: 13px;
}

.empty-commands {
  padding: 20px;
  text-align: center;
  color: #71717a;
}

:deep(.el-dialog) {
  background: #18181b;
  border: 1px solid #3f3f46;
}
:deep(.el-dialog__header) {
  background: #18181b;
  border-bottom: 1px solid #3f3f46;
  padding: 16px 20px;
}
:deep(.el-dialog__title) {
  color: #d4d4d8;
  font-size: 15px;
  font-weight: 500;
}
:deep(.el-dialog__headerbtn) {
  top: 16px;
  right: 16px;
}
:deep(.el-dialog__headerbtn .el-dialog__close) {
  color: #71717a;
}
:deep(.el-dialog__headerbtn:hover .el-dialog__close) {
  color: #fff;
}
:deep(.el-dialog__body) {
  background: #18181b;
  padding: 20px;
  color: #d4d4d8;
}
</style>
