<template>
  <div class="overlay" @click.self="$emit('close')">
    <div class="dialog">
      <div class="dialog-header">
        <span>重命名探讨</span>
        <button class="dialog-close" @click="$emit('close')">&times;</button>
      </div>
      <div class="dialog-body">
        <input
          v-model="name"
          class="dialog-input"
          placeholder="请输入新名称"
          @keydown.enter="handleConfirm"
          ref="input"
        />
      </div>
      <div class="dialog-footer">
        <button class="btn-outline" @click="$emit('close')">取消</button>
        <button class="btn-primary" @click="handleConfirm" :disabled="!name.trim()">确定</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'DesktopRenameDialog',
  props: {
    value: { type: String, default: '' }
  },
  emits: ['close', 'confirm'],
  data() {
    return { name: this.value }
  },
  mounted() {
    this.$nextTick(() => this.$refs.input && this.$refs.input.focus())
  },
  methods: {
    handleConfirm() {
      if (!this.name.trim()) return
      this.$emit('confirm', this.name.trim())
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
  width: 400px; max-width: 90vw;
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
.dialog-body { padding: 20px 16px; }
.dialog-input {
  width: 100%; padding: 8px 12px; border: 1px solid var(--border); border-radius: 6px;
  font-size: 13px; font-family: inherit; outline: none; box-sizing: border-box;
  color: var(--text-primary);
}
.dialog-input:focus { border-color: var(--accent); box-shadow: 0 0 0 2px rgba(79,110,247,0.1); }
.dialog-footer {
  display: flex; align-items: center; justify-content: flex-end; gap: 8px;
  padding: 10px 16px; border-top: 1px solid var(--border);
}
.btn-outline {
  padding: 6px 14px; background: #fff; color: var(--text-secondary); border: 1px solid var(--border);
  border-radius: 5px; font-size: 12px; cursor: pointer; font-family: inherit;
}
.btn-outline:hover { background: var(--bg-hover); }
.btn-primary {
  padding: 6px 14px; background: var(--accent); color: #fff; border: none; border-radius: 5px;
  font-size: 12px; cursor: pointer; font-family: inherit; font-weight: 600;
}
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
