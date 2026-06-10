<template>
  <div>
    <div class="dialog-overlay" :class="{ show: visible }" @click="onCancel"></div>
    <div class="dialog-sheet" :class="{ show: visible }">
      <div class="dialog-header">
        <span class="dialog-title">新建子方案</span>
        <button class="dialog-close" @click="onCancel">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
      <div class="dialog-body">
        <div class="form-group">
          <label>方案名称</label>
          <input
            v-model="name"
            class="form-input"
            placeholder="请输入子方案名称"
            @keyup.enter="onConfirm"
          />
        </div>
        <div class="form-group">
          <label>所属大类</label>
          <div class="form-text">{{ category }}</div>
        </div>
        <div class="form-group">
          <label>父方案</label>
          <div class="form-text">{{ parentName }}</div>
        </div>
      </div>
      <div class="dialog-actions">
        <button class="btn-cancel" @click="onCancel">取消</button>
        <button class="btn-confirm" :disabled="!name.trim()" @click="onConfirm">确认</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'SubSchemeDialogApp',
  props: {
    visible: { type: Boolean, default: false },
    category: { type: String, default: '' },
    parentName: { type: String, default: '' },
    defaultName: { type: String, default: '' }
  },
  data() {
    return {
      name: ''
    }
  },
  watch: {
    visible(val) {
      if (val) {
        this.name = this.defaultName
      }
    }
  },
  methods: {
    onConfirm() {
      const trimmed = this.name.trim()
      if (!trimmed) return
      this.$emit('confirm', trimmed)
      this.$emit('update:visible', false)
    },
    onCancel() {
      this.$emit('cancel')
      this.$emit('update:visible', false)
    }
  }
}
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  opacity: 0;
  visibility: hidden;
  transition: all 0.3s;
  z-index: 1000;
}
.dialog-overlay.show {
  opacity: 1;
  visibility: visible;
}
.dialog-sheet {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #121212;
  border-radius: 16px 16px 0 0;
  transform: translateY(100%);
  transition: transform 0.3s ease;
  z-index: 1001;
  max-width: 430px;
  margin: 0 auto;
}
.dialog-sheet.show {
  transform: translateY(0);
}
.dialog-header {
  padding: 16px;
  border-bottom: 1px solid #27272a;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.dialog-title {
  font-size: 16px;
  font-weight: 500;
  color: #f4f4f5;
}
.dialog-close {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #18191b;
  border: none;
  color: #84848a;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.dialog-body {
  padding: 16px;
}
.form-group {
  margin-bottom: 16px;
}
.form-group label {
  display: block;
  font-size: 13px;
  color: #84848a;
  margin-bottom: 6px;
}
.form-input {
  width: 100%;
  padding: 10px 14px;
  background: #0a0a09;
  border: 1px solid #27272a;
  border-radius: 8px;
  color: #f4f4f5;
  font-size: 14px;
  outline: none;
  box-sizing: border-box;
}
.form-input:focus {
  border-color: #3b82f6;
}
.form-text {
  color: #d4d4d8;
  font-size: 14px;
  padding: 10px 0;
}
.dialog-actions {
  display: flex;
  gap: 12px;
  padding: 16px;
  border-top: 1px solid #27272a;
}
.dialog-actions button {
  flex: 1;
  padding: 12px;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  border: none;
}
.btn-cancel {
  background: #18191b;
  color: #d4d4d8;
}
.btn-confirm {
  background: #3b82f6;
  color: white;
}
.btn-confirm:disabled {
  background: #27272a;
  color: #52525b;
  cursor: not-allowed;
}
</style>
