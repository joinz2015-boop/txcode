const cache = {}

/**
 * 保存会话的滚动位置
 * @param {string} sessionId
 * @param {HTMLElement} scrollEl - 滚动容器 DOM 元素
 */
export function savePos(sessionId, scrollEl) {
  if (scrollEl) {
    cache[sessionId] = scrollEl.scrollTop
  }
}

/**
 * 恢复会话的滚动位置
 * @param {string} sessionId
 * @param {HTMLElement} scrollEl - 滚动容器 DOM 元素
 * @param {function} [nextTick] - Vue.$nextTick 或 setTimeout(fn) 用于等待渲染完成
 */
export function recoverPos(sessionId, scrollEl, nextTick) {
  const saved = cache[sessionId]
  if (saved != null && scrollEl) {
    const fn = () => {
      scrollEl.scrollTop = Math.min(saved, scrollEl.scrollHeight - scrollEl.clientHeight)
    }
    nextTick ? nextTick(fn) : fn()
  }
}

/**
 * 清除会话的滚动缓存（删除会话时调用）
 * @param {string} sessionId
 */
export function clearPos(sessionId) {
  delete cache[sessionId]
}
