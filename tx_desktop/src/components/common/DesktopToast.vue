<template>
  <div class="app-toasts">
    <div v-for="t in toasts" :key="t.id" class="app-toast" :class="t.type">
      <span class="toast-dot"></span>
      <span class="toast-msg">{{ t.msg }}</span>
    </div>
  </div>
</template>

<script>
import { eventBus } from '@/utils/eventBus'

const TOAST_DURATION = 3000

export default {
  name: 'DesktopToast',
  data() {
    return {
      toasts: [],
      toastId: 0,
      _unsubToast: null
    }
  },
  mounted() {
    this._unsubToast = eventBus.on('app:toast', (d) => {
      const msg = d && d.msg != null ? String(d.msg) : ''
      if (!msg) return
      const id = ++this.toastId
      this.toasts.push({ id, msg, type: d.type === 'err' ? 'err' : 'ok' })
      setTimeout(() => {
        this.toasts = this.toasts.filter(t => t.id !== id)
      }, TOAST_DURATION)
    })
  },
  beforeDestroy() {
    if (this._unsubToast) {
      this._unsubToast()
      this._unsubToast = null
    }
  }
}
</script>

<style scoped>
.app-toasts {
  position: fixed;
  top: 52px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 11000;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  pointer-events: none;
}
.app-toast {
  background: #1f2430;
  color: #fff;
  font-size: 12.5px;
  line-height: 1.5;
  padding: 8px 14px;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: 480px;
  word-break: break-word;
  animation: appToastIn 0.2s ease;
}
.toast-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.app-toast.ok .toast-dot { background: var(--green); }
.app-toast.err .toast-dot { background: var(--red); }
@keyframes appToastIn {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
