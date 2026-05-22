/**
 * 智能滚动到底部
 * @param {HTMLElement} container - 滚动容器元素
 * @param {object} options - 选项
 * @param {boolean} options.force - 是否强制滚到底部（默认 false，仅在底部时才滚动）
 * @param {number} options.threshold - 距离底部的阈值（默认50px）
 */
export function scrollToBottom(container, { force = false, threshold = 50 } = {}) {
  if (!container) return
  if (force) {
    container.scrollTop = container.scrollHeight
    return
  }
  const { scrollTop, scrollHeight, clientHeight } = container
  if (scrollHeight - scrollTop - clientHeight <= threshold) {
    container.scrollTop = scrollHeight
  }
}
