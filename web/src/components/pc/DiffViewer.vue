<template>
  <div class="flex-1 flex flex-col overflow-hidden">
    <div v-if="!change" class="flex-1 flex items-center justify-center text-textMuted">
      <div class="text-center">
        <i class="fa-solid fa-code text-6xl mb-4 opacity-20"></i>
        <p>点击文件查看变更详情</p>
      </div>
    </div>

    <div v-else class="flex-1 flex flex-col overflow-hidden">
      <div class="flex items-center justify-between px-4 py-2 border-b border-border bg-sidebar">
        <div class="flex items-center gap-2">
          <span
            class="text-xs font-bold px-1.5 py-0.5 rounded"
            :class="getStatusClass(change.status)"
          >
            {{ change.statusCode }}
          </span>
          <span class="text-white text-sm">{{ change.path }}</span>
        </div>
        <div class="flex items-center gap-2">
          <button @click="$emit('open-file', change)" class="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded">
            <i class="fa-solid fa-external-link-alt mr-1"></i> 打开文件
          </button>
          <button @click="$emit('revert', change)" class="px-3 py-1 text-xs bg-yellow-600 hover:bg-yellow-700 text-white rounded">
            <i class="fa-solid fa-undo mr-1"></i> 撤销
          </button>
        </div>
      </div>

      <div v-if="loading" class="flex-1 flex items-center justify-center text-textMuted">
        <i class="fa-solid fa-spinner fa-spin mr-2"></i> 加载 diff 中...
      </div>

      <div v-else-if="diffContent" class="flex-1 flex overflow-hidden">
        <div class="flex-1 flex flex-col overflow-hidden border-r border-border">
          <div class="px-4 py-2 bg-[#3c3c3c] border-b border-border text-xs text-gray-300 font-bold">
            旧版本 (Original)
          </div>
          <div class="flex-1 overflow-auto bg-[#2d2d2d]">
            <div
              v-for="(line, idx) in oldLines"
              :key="'old-' + idx"
              class="flex font-mono text-sm"
              :class="getLineClass(line)"
            >
              <span class="w-12 shrink-0 text-right pr-2 select-none opacity-40">{{ line.lineNum || '' }}</span>
              <span class="flex-1 whitespace-pre"><span class="select-none font-bold w-4 inline-block">{{ getLinePrefix(line) }}</span>{{ line.content }}</span>
            </div>
          </div>
        </div>
        <div class="flex-1 flex flex-col overflow-hidden">
          <div class="px-4 py-2 bg-[#3c3c3c] border-b border-border text-xs text-gray-300 font-bold">
            新版本 (Modified)
          </div>
          <div class="flex-1 overflow-auto bg-[#2d2d2d]">
            <div
              v-for="(line, idx) in newLines"
              :key="'new-' + idx"
              class="flex font-mono text-sm"
              :class="getLineClass(line)"
            >
              <span class="w-12 shrink-0 text-right pr-2 select-none opacity-40">{{ line.lineNum || '' }}</span>
              <span class="flex-1 whitespace-pre"><span class="select-none font-bold w-4 inline-block">{{ getLinePrefix(line) }}</span>{{ line.content }}</span>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="flex-1 flex items-center justify-center text-textMuted">
        <div class="text-center">
          <i class="fa-solid fa-file text-4xl mb-4 opacity-30"></i>
          <p>无法显示此文件的 diff</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'DiffViewer',
  props: {
    change: {
      type: Object,
      default: null
    },
    diffContent: {
      type: String,
      default: ''
    },
    loading: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      oldLines: [],
      newLines: []
    }
  },
  watch: {
    diffContent: {
      immediate: true,
      handler(val) {
        this.parseDiff(val)
      }
    }
  },
  methods: {
    getStatusClass(status) {
      const classes = {
        modified: 'bg-blue-600 text-white',
        added: 'bg-green-600 text-white',
        deleted: 'bg-red-600 text-white',
        untracked: 'bg-gray-600 text-white',
        renamed: 'bg-purple-600 text-white'
      }
      return classes[status] || 'bg-gray-600 text-white'
    },
    getLinePrefix(line) {
      if (line.removed) return '-'
      if (line.added) return '+'
      return ' '
    },
    getLineClass(line) {
      if (line.type === 'header') {
        return 'bg-[#1a1a1a] text-blue-400'
      }
      if (line.removed) {
        return 'bg-red-900/50 text-red-300'
      }
      if (line.added) {
        return 'bg-green-900/50 text-green-300'
      }
      if (line.empty) {
        return 'bg-[#252525]'
      }
      return 'text-gray-200'
    },
    parseDiff(diff) {
      this.oldLines = []
      this.newLines = []
      
      if (!diff) return
      
      const lines = diff.split('\n')
      let oldLineNum = 1
      let newLineNum = 1
      
      for (const line of lines) {
        if (line.startsWith('@@')) {
          const match = line.match(/@@ -(\d+),?\d* \+(\d+),?\d* @@/)
          if (match) {
            oldLineNum = parseInt(match[1])
            newLineNum = parseInt(match[2])
          }
          this.oldLines.push({ lineNum: '', content: line, type: 'header' })
          this.newLines.push({ lineNum: '', content: line, type: 'header' })
        } else if (line.startsWith('---') || line.startsWith('+++') || line.startsWith('diff ') || line.startsWith('index ')) {
        } else if (line.startsWith('-')) {
          this.oldLines.push({ lineNum: oldLineNum++, content: line.substring(1), removed: true })
          this.newLines.push({ lineNum: '', content: '', empty: true })
        } else if (line.startsWith('+')) {
          this.oldLines.push({ lineNum: '', content: '', empty: true })
          this.newLines.push({ lineNum: newLineNum++, content: line.substring(1), added: true })
        } else {
          this.oldLines.push({ lineNum: oldLineNum++, content: line })
          this.newLines.push({ lineNum: newLineNum++, content: line })
        }
      }
    }
  }
}
</script>
