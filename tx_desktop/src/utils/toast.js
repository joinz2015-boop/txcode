import { eventBus } from '@/utils/eventBus'

export function showToast(msg, type = 'ok') {
  eventBus.emit('app:toast', { msg: msg == null ? '' : String(msg), type: type === 'err' ? 'err' : 'ok' })
}

export function showError(msg) {
  showToast(msg, 'err')
}

export default showToast
