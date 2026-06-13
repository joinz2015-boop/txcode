import { marked } from 'marked'

export function getTodoStatusIcon(status) {
  const icons = { completed: '✅', in_progress: '🔄', pending: '⬜', cancelled: '❌' }
  return icons[status] || '⬜'
}

export function getTitleText(text, defaultText) {
  if (!text) return defaultText
  return text.length > 30 ? text.slice(0, 30) + '...' : text
}

export function formatInput(action, input) {
  try {
    const parsed = JSON.parse(input)
    if (action === 'bash' || action === 'execute_bash') {
      return parsed.command + (parsed.workdir ? ` (${parsed.workdir})` : '')
    }
    if (action === 'read_file') {
      return parsed.file_path + (parsed.offset ? `:${parsed.offset}` : '')
    }
    if (action === 'edit_file' || action === 'write_file') {
      return parsed.file_path
    }
    if (action === 'glob' || action === 'find_files') {
      return parsed.pattern + (parsed.directory ? ` (${parsed.directory})` : '')
    }
    if (action === 'grep' || action === 'search_content') {
      return `"${parsed.pattern}" (${parsed.directory || ''})`
    }
    return input
  } catch {
    return input
  }
}

export function getToolCallName(toolCall) {
  return toolCall?.function?.name || 'unknown_tool'
}

export function getToolCallArguments(toolCall) {
  return toolCall?.function?.arguments || ''
}

export function renderMarkdown(text) {
  return text ? marked(text) : ''
}

export function createThinkItem(content) {
  return {
    type: 'think',
    content,
    renderedContent: renderMarkdown(content)
  }
}

export function createStepItem(data) {
  const thought = data?.thought || ''
  return {
    type: 'step',
    thought,
    renderedThought: renderMarkdown(thought),
    toolCalls: Array.isArray(data?.toolCalls) ? data.toolCalls.filter(Boolean) : [],
    success: data?.success
  }
}

export function withLogId(item, getNextSeq) {
  if (!item || typeof item !== 'object') return { type: 'system', content: String(item), _id: `log-${getNextSeq()}` }
  if (item._id) return item
  return { ...item, _id: `log-${getNextSeq()}` }
}
