<template>
  <div class="overlay" @click.self="$emit('close')">
    <div class="dialog">
      <div class="dialog-header">
        <span>新建子方案</span>
        <button class="dialog-close" @click="$emit('close')">&times;</button>
      </div>
      <div class="dialog-body">
        <div class="form-group">
          <label class="form-label">方案名称</label>
          <input
            class="form-input"
            v-model="sessionName"
            placeholder="输入子方案名称..."
            @keydown.enter="handleConfirm"
            ref="nameInput"
          />
        </div>
        <p class="form-hint">子方案将关联到当前方案，作为其子方案。</p>
      </div>
      <div class="dialog-footer">
        <button class="btn-outline" @click="$emit('close')">取消</button>
        <button class="btn-primary" @click="handleConfirm" :disabled="!sessionName.trim()">确定</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'DesktopCreateSubPlanDialog',
  emits: ['close', 'confirm'],
  data() {
    return {
      sessionName: '新子方案'
    }
  },
  mounted() {
    this.$nextTick(() => {
      if (this.$refs.nameInput) {
        this.$refs.nameInput.focus()
        this.$refs.nameInput.select()
      }
    })
  },
  methods: {
    handleConfirm() {
      const name = this.sessionName.trim()
      if (!name) return
      this.$emit('confirm', name)
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
.form-group { margin-bottom: 12px; }
.form-label {
  display: block; font-size: 13px; font-weight: 500; color: var(--text-primary); margin-bottom: 6px;
}
.form-input {
  width: 100%; padding: 8px 12px; font-size: 13px; border: 1px solid var(--border);
  border-radius: 6px; color: var(--text-primary); background: #fafbfc; outline: none; font-family: inherit;
  box-sizing: border-box;
}
.form-input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(79,110,247,0.08); }
.form-hint { font-size: 12px; color: var(--text-muted); margin: 0; }
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
