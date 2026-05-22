/**
 * 捕获容器当前滚动状态快照（在 push 消息前调用，避免 $nextTick 后 scrollHeight 已变化导致误判）
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
 * 智能滚动到底部
 * @param {HTMLElement} container - 滚动容器元素
 * @param {object} options - 选项
 * @param {boolean} options.force - 是否强制滚到底部（默认 false）
 * @param {number} options.threshold - 距离底部的阈值（默认150px）
 * @param {{ scrollTop: number, scrollHeight: number, clientHeight: number }} options.prevSnapshot - push 前的快照，用于准确判断用户之前是否在底部
 */
export function scrollToBottom(container, { force = false, threshold = 150, prevSnapshot = null } = {}) {
  if (!container) {
    console.log('[scrollToBottom] container is null/undefined, skip')
    return
  }
  const curDist = container.scrollHeight - container.scrollTop - container.clientHeight
  if (force) {
    container.scrollTop = container.scrollHeight
    console.log('[scrollToBottom] force scroll → scrollTop:', container.scrollHeight, '| curDist:', curDist)
    return
  }
  const refDist = prevSnapshot
    ? prevSnapshot.scrollHeight - prevSnapshot.scrollTop - prevSnapshot.clientHeight
    : curDist
  console.log('[scrollToBottom] force: false | scrollTop:', container.scrollTop, '| scrollHeight:', container.scrollHeight, '| clientHeight:', container.clientHeight, '| curDist:', curDist, '| refDist:', refDist, '| threshold:', threshold)
  if (refDist <= threshold) {
    container.scrollTop = container.scrollHeight
    console.log('[scrollToBottom] SCROLL (refDist <= threshold)')
  } else {
    console.log('[scrollToBottom] SKIP (refDist > threshold, user was away from bottom)')
  }
}
