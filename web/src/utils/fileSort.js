/**
 * 文件/文件夹列表排序：文件夹优先，同类按名称升序（忽略大小写、数字自然排序）
 * @param {Array} items 文件列表项（含 is_directory、name 字段）
 * @returns {Array} 排序后的新数组（不修改原数组）
 */
export function sortFileItems(items) {
  return (items || []).slice().sort((a, b) => {
    const aDir = !!a.is_directory
    const bDir = !!b.is_directory
    if (aDir !== bDir) return aDir ? -1 : 1
    return a.name.localeCompare(b.name, undefined, {
      numeric: true,
      sensitivity: 'base'
    })
  })
}