function isDir(item) {
  if (typeof item.is_directory === 'boolean') return item.is_directory
  if (typeof item.type === 'string') return item.type === 'directory' || item.type === 'dir'
  return false
}

/**
 * 文件/文件夹列表排序：文件夹优先，同类按名称升序（忽略大小写、数字自然排序）
 * 兼容三种节点结构：
 *  - 后端原始 browse：{ is_directory, name }
 *  - 后端 tree_file：{ type: 'directory' | 'file', name }
 *  - desktop normalize 后：{ type: 'dir' | 'file', name }
 * @param {Array} items 文件列表项
 * @returns {Array} 排序后的新数组（不修改原数组）
 */
export function sortFileItems(items) {
  return (items || []).slice().sort((a, b) => {
    const aDir = isDir(a)
    const bDir = isDir(b)
    if (aDir !== bDir) return aDir ? -1 : 1
    return (a.name || '').localeCompare(b.name || '', undefined, {
      numeric: true,
      sensitivity: 'base'
    })
  })
}