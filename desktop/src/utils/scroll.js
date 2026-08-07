/**
 * 捕获容器当前滚动状态快照（在 push 消息前调用，避免 DOM 更新后 scrollHeight 变化导致误判）
 * @param {HTMLElement} container
 * @returns {{ scrollTop: number, scrollHeight: number, clientHeight: number } | null}
 */
export function snapshotScroll(container) {
  if (!container) return null
  return {
    scrollTop: container.scrollTop,
    scrollHeight: container.scrollHeight,
    clientHeight: container.clientHeight
  }
}

/**
 * 智能滚动到底部：仅当用户原本在底部（距离 <= threshold）时才滚动
 * @param {HTMLElement} container - 滚动容器元素
 * @param {object} options - 选项
 * @param {boolean} options.force - 是否强制滚到底部（默认 false）
 * @param {number} options.threshold - 距离底部的阈值（默认150px）
 * @param {{ scrollTop: number, scrollHeight: number, clientHeight: number }} options.prevSnapshot - push 前的快照，用于准确判断用户之前是否在底部
 */
export function scrollToBottom(container, { force = false, threshold = 150, prevSnapshot = null } = {}) {
  if (!container) return
  if (force) {
    container.scrollTop = container.scrollHeight
    return
  }
  const refDist = prevSnapshot
    ? prevSnapshot.scrollHeight - prevSnapshot.scrollTop - prevSnapshot.clientHeight
    : container.scrollHeight - container.scrollTop - container.clientHeight
  if (refDist <= threshold) {
    container.scrollTop = container.scrollHeight
  }
}
