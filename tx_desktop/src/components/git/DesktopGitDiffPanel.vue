<template>
  <div class="git-diff-panel">
    <div class="diff-toolbar">
      <div class="dt-left">
        <div class="file-type-icon">{{ fileType }}</div>
        <div class="dt-file-info">
          <div class="dt-file-name">{{ fileName }}</div>
          <div class="dt-file-meta">
            {{ hunks.length }} 个变更区块 &nbsp;|&nbsp; <span class="add">+{{ stats.added }} 行</span>
            &nbsp;|&nbsp; <span class="del">-{{ stats.removed }} 行</span>
            &nbsp;|&nbsp; {{ stats.totalNew }} 行总计
          </div>
        </div>
      </div>
      <div class="dt-right">
        <div class="view-mode">
          <button class="view-mode-btn" :class="{ active: viewMode === 'split' }" @click="$emit('update:viewMode', 'split')" title="并排对比">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="8" height="16"/><rect x="13" y="4" width="8" height="16"/></svg>
          </button>
          <button class="view-mode-btn" :class="{ active: viewMode === 'inline' }" @click="$emit('update:viewMode', 'inline')" title="内联合并">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="16"/></svg>
          </button>
        </div>
        <button class="tool-btn" :class="{ active: syncEnabled }" @click="$emit('update:syncEnabled', !syncEnabled)" title="同步滚动">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
          同步
        </button>
        <button class="tool-btn" :class="{ active: folded }" @click="toggleFold" title="折起未变更">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>
          折起
        </button>
        <button class="tool-btn" @click="$emit('open-file', change)" title="在编辑器中打开">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        </button>
        <button class="tool-btn" @click="$emit('refresh')" title="刷新">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
        </button>
      </div>
    </div>

    <div v-if="largeFileNotice" class="large-file-notice">文件过大（{{ totalLines }} 行），已自动折起未变更区块</div>

    <div class="branch-header" v-if="viewMode === 'split' && !isBinary">
      <div class="bh-num">&nbsp;</div>
      <div class="bh-prefix">&nbsp;</div>
      <div class="bh-side old"><span class="bh-tag">OLD</span><span class="bh-hash">{{ oldLabel }}</span></div>
      <div class="bh-num">&nbsp;</div>
      <div class="bh-prefix">&nbsp;</div>
      <div class="bh-side new"><span class="bh-tag">NEW</span><span class="bh-hash">{{ newLabel }}</span></div>
    </div>

    <div v-if="isBinary" class="empty-state">
      <p class="empty-title">二进制文件无法预览</p>
    </div>

    <div class="diff-content" v-else>
      <div class="split-view" v-show="viewMode === 'split'">
        <div class="diff-side left">
          <div class="diff-side-head old"><span class="tag">OLD</span> 旧版本</div>
          <div class="diff-scroll" ref="leftScroll">
            <div class="diff-inner">
              <div
                v-for="(line, idx) in displayOldLines"
                :key="'o-' + idx"
                class="dline"
                :class="line.type"
                :title="line.type === 'fold' ? '点击展开' : ''"
                @click="line.type === 'fold' && expandSegment(line)"
              >
                <div class="ln">{{ line.type === 'fold' ? '...' : (line.num !== null && line.num !== undefined ? line.num : '') }}</div>
                <div class="pfx">{{ linePrefix(line) }}</div>
                <div class="ct">{{ lineContent(line) }}</div>
              </div>
            </div>
          </div>
        </div>
        <div class="diff-side">
          <div class="diff-side-head new"><span class="tag">NEW</span> 新版本</div>
          <div class="diff-scroll" ref="rightScroll">
            <div class="diff-inner">
              <div
                v-for="(line, idx) in displayNewLines"
                :key="'n-' + idx"
                class="dline"
                :class="line.type"
                :title="line.type === 'fold' ? '点击展开' : ''"
                @click="line.type === 'fold' && expandSegment(line)"
              >
                <div class="ln">{{ line.type === 'fold' ? '...' : (line.num !== null && line.num !== undefined ? line.num : '') }}</div>
                <div class="pfx">{{ linePrefix(line) }}</div>
                <div class="ct">{{ lineContent(line) }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="inline-view" v-show="viewMode === 'inline'">
        <div class="inline-scroll" ref="inlineScroll">
          <div>
            <div
              v-for="(line, idx) in inlineLines"
              :key="'i-' + idx"
              class="uline"
              :class="line.type"
              :title="line.type === 'fold' ? '点击展开' : ''"
              @click="line.type === 'fold' && expandSegment(line)"
            >
              <div class="uln">{{ line.type === 'fold' ? '...' : (line.oldNum !== null && line.oldNum !== undefined ? line.oldNum : '') }}</div>
              <div class="uln">{{ line.type === 'fold' ? '' : (line.newNum !== null && line.newNum !== undefined ? line.newNum : '') }}</div>
              <div class="upfx">{{ inlinePrefix(line) }}</div>
              <div class="uct">{{ line.type === 'fold' ? inlineFoldText(line) : line.content }}</div>
            </div>
          </div>
        </div>
      </div>

      <DesktopGitMinimap
        v-if="viewMode === 'split'"
        :lines="minimapLines"
        :scroll-top="minimapState.scrollTop"
        :scroll-height="minimapState.scrollHeight"
        :client-height="minimapState.clientHeight"
        :visible="minimapVisible"
        @jump="jumpTo"
      />
    </div>

    <div class="diff-statusbar">
      <div class="sb-left">
        <span class="sb-item">{{ hunks.length }} 个变更区块</span>
        <span class="sb-add">+{{ stats.added }}</span>
        <span class="sb-del">-{{ stats.removed }}</span>
      </div>
      <div class="sb-right">
        <span class="sb-item">{{ languageLabel }}</span>
        <span class="sb-item">{{ syncEnabled ? '同步滚动已启用' : '同步滚动已禁用' }}</span>
        <span class="sb-item">{{ currentRange || '第 1 行起' }}</span>
      </div>
    </div>
  </div>
</template>

<script>
import DesktopGitMinimap from './DesktopGitMinimap.vue'

const FOLD_THRESHOLD = 8
const LARGE_FILE_LIMIT = 20000
const LINE_HEIGHT = 19.2

export default {
  name: 'DesktopGitDiffPanel',
  components: { DesktopGitMinimap },
  props: {
    change: { type: Object, required: true },
    diffData: { type: Object, default: null },
    loading: { type: Boolean, default: false },
    viewMode: { type: String, default: 'split' },
    syncEnabled: { type: Boolean, default: true },
    folded: { type: Boolean, default: false }
  },
  data() {
    return {
      expandedSegments: {},
      isProgrammaticScroll: false,
      minimapState: { scrollTop: 0, scrollHeight: 1, clientHeight: 1 },
      minimapVisible: true,
      currentRange: '',
      largeFileNotice: false,
      _foldTouched: false
    }
  },
  computed: {
    isBinary() {
      return !!(this.diffData && this.diffData.isBinary)
    },
    stats() {
      return (this.diffData && this.diffData.stats) || { added: 0, removed: 0, totalOld: 0, totalNew: 0 }
    },
    hunks() {
      return (this.diffData && this.diffData.hunks) || []
    },
    fileName() {
      const p = this.change ? this.change.path : ''
      const parts = String(p).replace(/\\/g, '/').split('/')
      return parts[parts.length - 1] || p
    },
    fileType() {
      const idx = this.fileName.lastIndexOf('.')
      return idx >= 0 ? this.fileName.substring(idx + 1).toUpperCase().slice(0, 3) : 'TXT'
    },
    languageLabel() {
      const idx = this.fileName.lastIndexOf('.')
      return idx >= 0 ? this.fileName.substring(idx + 1).toLowerCase() : 'text'
    },
    oldLabel() {
      if (!this.change) return ''
      if (this.change.staged) return (this.diffData && this.diffData.head && this.diffData.head.hash) || 'Index'
      return 'Index'
    },
    newLabel() {
      if (!this.change) return ''
      if (this.change.staged) return 'Index'
      return 'Working Tree'
    },
    totalLines() {
      if (!this.diffData) return 0
      return Math.max(this.diffData.oldLines.length, this.diffData.newLines.length)
    },
    displayOldLines() {
      return this.buildDisplay().outOld
    },
    displayNewLines() {
      return this.buildDisplay().outNew
    },
    inlineLines() {
      const { outOld, outNew } = this.buildDisplay()
      const result = []
      for (let i = 0; i < outOld.length; i++) {
        const o = outOld[i]
        const n = outNew[i]
        if (o.type === 'fold') {
          result.push({ type: 'fold', oldNum: null, newNum: null, count: o.count, segKey: o.segKey, content: '' })
        } else if (o.type === 'removed') {
          result.push({ type: 'removed', oldNum: o.num, newNum: null, content: o.content })
        } else if (n.type === 'added') {
          result.push({ type: 'added', oldNum: null, newNum: n.num, content: n.content })
        } else {
          result.push({ type: 'normal', oldNum: o.num, newNum: n.num, content: o.content })
        }
      }
      return result
    },
    minimapLines() {
      const { outOld, outNew } = this.buildDisplay()
      const lines = []
      for (let i = 0; i < outOld.length; i++) {
        const o = outOld[i]
        const n = outNew[i]
        if (o.type === 'removed') lines.push({ type: 'removed' })
        else if (n.type === 'added') lines.push({ type: 'added' })
        else lines.push({ type: 'normal' })
      }
      return lines
    }
  },
  watch: {
    diffData() {
      this.onDiffData()
    },
    viewMode() {
      this.$nextTick(() => {
        this.resetScroll()
        this.updateMinimapState()
      })
    }
  },
  mounted() {
    this._onResize = () => {
      this.minimapVisible = this.$el ? this.$el.clientWidth >= 1100 : true
    }
    window.addEventListener('resize', this._onResize)
    this.$nextTick(() => {
      this.bindScroll()
      this.updateMinimapState()
      this._onResize()
    })
  },
  activated() {
    this.$nextTick(() => {
      this.bindScroll()
      this.updateMinimapState()
      this._onResize()
    })
  },
  deactivated() {
    this.unbindScroll()
  },
  beforeDestroy() {
    this.unbindScroll()
    if (this._onResize) {
      window.removeEventListener('resize', this._onResize)
      this._onResize = null
    }
  },
  methods: {
    onDiffData() {
      this.$nextTick(() => {
        this.resetScroll()
        this.bindScroll()
        this.updateMinimapState()
      })
      const total = this.totalLines
      if (total > LARGE_FILE_LIMIT) {
        this.largeFileNotice = true
        if (!this._foldTouched) {
          this.$emit('update:folded', true)
        }
      } else {
        this.largeFileNotice = false
      }
    },
    buildDisplay() {
      const oldLines = (this.diffData && this.diffData.oldLines) || []
      const newLines = (this.diffData && this.diffData.newLines) || []
      const count = Math.max(oldLines.length, newLines.length)
      const outOld = []
      const outNew = []
      let i = 0
      while (i < count) {
        const o = oldLines[i] || { num: null, type: 'empty', content: '' }
        const n = newLines[i] || { num: null, type: 'empty', content: '' }
        if (this.folded && o.type === 'normal' && n.type === 'normal') {
          let j = i + 1
          while (j < count && oldLines[j] && newLines[j] && oldLines[j].type === 'normal' && newLines[j].type === 'normal') {
            j++
          }
          const segLen = j - i
          if (segLen >= FOLD_THRESHOLD) {
            const segKey = 'seg-' + i
            if (this.expandedSegments[segKey]) {
              for (let k = i; k < j; k++) {
                outOld.push(oldLines[k])
                outNew.push(newLines[k])
              }
            } else {
              const oldStart = oldLines[i] ? oldLines[i].num : null
              const newStart = newLines[i] ? newLines[i].num : null
              outOld.push({ type: 'fold', count: segLen, oldNum: oldStart, newNum: newStart, segKey })
              outNew.push({ type: 'fold', count: segLen, oldNum: oldStart, newNum: newStart, segKey })
            }
            i = j
            continue
          }
        }
        outOld.push(o)
        outNew.push(n)
        i++
      }
      return { outOld, outNew }
    },
    linePrefix(line) {
      if (line.type === 'removed') return '-'
      if (line.type === 'added') return '+'
      return ''
    },
    lineContent(line) {
      if (line.type === 'fold') return `... ${line.count} 行未变更（点击展开）`
      return line.content
    },
    inlinePrefix(line) {
      if (line.type === 'removed') return '-'
      if (line.type === 'added') return '+'
      return ''
    },
    inlineFoldText(line) {
      return `... ${line.count} 行未变更（点击展开）`
    },
    expandSegment(line) {
      if (!line.segKey) return
      this.$set(this.expandedSegments, line.segKey, true)
    },
    toggleFold() {
      this._foldTouched = true
      this.$emit('update:folded', !this.folded)
    },
    bindScroll() {
      this.unbindScroll()
      const left = this.$refs.leftScroll
      const right = this.$refs.rightScroll
      if (left) {
        this._onLeft = () => {
          this.updateMinimapState()
          this.syncScroll(left, right)
        }
        left.addEventListener('scroll', this._onLeft, { passive: true })
      }
      if (right) {
        this._onRight = () => {
          this.syncScroll(right, left)
        }
        right.addEventListener('scroll', this._onRight, { passive: true })
      }
    },
    unbindScroll() {
      const left = this.$refs.leftScroll
      const right = this.$refs.rightScroll
      if (left && this._onLeft) {
        left.removeEventListener('scroll', this._onLeft)
        this._onLeft = null
      }
      if (right && this._onRight) {
        right.removeEventListener('scroll', this._onRight)
        this._onRight = null
      }
    },
    syncScroll(source, target) {
      if (!this.syncEnabled || this.isProgrammaticScroll || !target) return
      this.isProgrammaticScroll = true
      target.scrollTop = source.scrollTop
      const maxS = Math.max(1, source.scrollWidth - source.clientWidth)
      const ratio = source.scrollLeft / maxS
      const maxT = Math.max(1, target.scrollWidth - target.clientWidth)
      target.scrollLeft = ratio * maxT
      requestAnimationFrame(() => {
        this.isProgrammaticScroll = false
      })
    },
    resetScroll() {
      const left = this.$refs.leftScroll
      const right = this.$refs.rightScroll
      const inline = this.$refs.inlineScroll
      if (left) {
        left.scrollTop = 0
        left.scrollLeft = 0
      }
      if (right) {
        right.scrollTop = 0
        right.scrollLeft = 0
      }
      if (inline) {
        inline.scrollTop = 0
        inline.scrollLeft = 0
      }
      this.currentRange = ''
    },
    updateMinimapState() {
      const el = this.viewMode === 'inline' ? this.$refs.inlineScroll : this.$refs.leftScroll
      if (!el) return
      this.minimapState = {
        scrollTop: el.scrollTop,
        scrollHeight: el.scrollHeight,
        clientHeight: el.clientHeight
      }
      this.currentRange = this.computeRange(el)
    },
    computeRange(el) {
      const start = Math.floor(el.scrollTop / LINE_HEIGHT) + 1
      const end = Math.floor((el.scrollTop + el.clientHeight) / LINE_HEIGHT)
      return `第 ${start}-${end} 行`
    },
    jumpTo(ratio) {
      const el = this.viewMode === 'inline' ? this.$refs.inlineScroll : this.$refs.leftScroll
      if (!el) return
      el.scrollTop = Math.max(0, ratio * el.scrollHeight - el.clientHeight / 2)
      this.updateMinimapState()
    }
  }
}
</script>

<style scoped>
.git-diff-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
  background: var(--bg-chat);
}
.diff-toolbar {
  height: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  background: var(--bg-titlebar);
  border-bottom: 1px solid var(--border);
  gap: 12px;
  flex-shrink: 0;
}
.dt-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex: 1;
}
.file-type-icon {
  width: 26px;
  height: 26px;
  border-radius: 6px;
  flex-shrink: 0;
  background: #dbeafe;
  color: var(--accent);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  font-family: 'JetBrains Mono', Consolas, monospace;
}
.dt-file-info {
  min-width: 0;
}
.dt-file-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  font-family: 'JetBrains Mono', Consolas, monospace;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.dt-file-meta {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 1px;
  white-space: nowrap;
}
.dt-file-meta .add {
  color: var(--green);
  font-weight: 600;
  font-family: 'JetBrains Mono', Consolas, monospace;
}
.dt-file-meta .del {
  color: var(--red);
  font-weight: 600;
  font-family: 'JetBrains Mono', Consolas, monospace;
}
.dt-right {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}
.tool-btn {
  height: 28px;
  padding: 0 10px;
  border: 1px solid var(--border);
  background: #fff;
  color: var(--text-secondary);
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  font-family: inherit;
  display: flex;
  align-items: center;
  gap: 5px;
  transition: all 0.15s;
  font-weight: 500;
}
.tool-btn:hover {
  color: var(--text-primary);
  border-color: var(--accent);
}
.tool-btn.active {
  color: var(--accent);
  border-color: var(--accent);
  background: var(--accent-light);
}
.tool-btn svg {
  width: 13px;
  height: 13px;
}
.view-mode {
  display: flex;
  align-items: center;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 2px;
}
.view-mode-btn {
  width: 28px;
  height: 22px;
  padding: 0;
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}
.view-mode-btn:hover {
  color: var(--text-secondary);
}
.view-mode-btn.active {
  background: var(--bg-input);
  color: var(--text-primary);
}
.view-mode-btn svg {
  width: 13px;
  height: 13px;
}
.large-file-notice {
  padding: 6px 14px;
  font-size: 12px;
  color: var(--yellow);
  background: #fffbeb;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.branch-header {
  display: grid;
  grid-template-columns: 40px 16px 1fr 40px 16px 1fr;
  background: var(--bg-titlebar);
  border-bottom: 1px solid var(--border);
  font-size: 11px;
  font-family: 'JetBrains Mono', Consolas, monospace;
  flex-shrink: 0;
}
.bh-num,
.bh-prefix {
  background: var(--bg-titlebar);
  display: flex;
  align-items: center;
  justify-content: center;
  border-right: 1px solid var(--border);
  color: var(--text-muted);
}
.bh-side {
  padding: 6px 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  overflow: hidden;
  border-right: 1px solid var(--border);
}
.bh-side:last-child {
  border-right: none;
}
.bh-side.old {
  color: var(--red);
  background: #fef2f2;
}
.bh-side.new {
  color: var(--green);
  background: #f0fdf4;
}
.bh-tag {
  font-size: 9px;
  padding: 1px 6px;
  border-radius: 8px;
  font-weight: 700;
  background: rgba(255, 255, 255, 0.7);
  flex-shrink: 0;
}
.bh-hash {
  color: var(--text-secondary);
  font-weight: 600;
  flex-shrink: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.diff-content {
  flex: 1;
  display: flex;
  overflow: hidden;
  background: var(--bg-code);
  min-height: 0;
  position: relative;
}
.split-view {
  display: flex;
  flex: 1;
  min-width: 0;
  min-height: 0;
}
.diff-side {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #fff;
}
.diff-side.left {
  border-right: 1px solid var(--border);
}
.diff-side-head {
  padding: 5px 12px;
  background: var(--bg-titlebar);
  border-bottom: 1px solid var(--border);
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 6px;
}
.diff-side-head .tag {
  font-size: 9px;
  padding: 1px 6px;
  border-radius: 8px;
  font-weight: 700;
  font-family: 'JetBrains Mono', Consolas, monospace;
}
.diff-side-head.old .tag {
  background: #fee2e2;
  color: var(--red);
}
.diff-side-head.new .tag {
  background: #d1fae5;
  color: var(--green);
}
.diff-scroll {
  flex: 1;
  overflow: auto;
  font-family: 'JetBrains Mono', Consolas, monospace;
  font-size: 12px;
  line-height: 1.6;
  background: #fff;
}
.diff-inner {
  display: block;
  min-width: 100%;
}
.dline {
  display: flex;
  min-height: 19.2px;
  white-space: pre;
}
.ln {
  width: 40px;
  min-width: 40px;
  text-align: right;
  padding-right: 8px;
  color: var(--text-muted);
  user-select: none;
  font-size: 11px;
  background: var(--bg-side);
  border-right: 1px solid var(--border);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  line-height: 1.6;
}
.pfx {
  width: 16px;
  min-width: 16px;
  text-align: center;
  flex-shrink: 0;
  user-select: none;
  font-weight: 700;
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1.6;
}
.ct {
  flex: 1;
  white-space: pre;
  overflow: visible;
  padding-left: 4px;
  line-height: 1.6;
}
.dline.removed {
  background: #fef2f2;
}
.dline.removed .ln {
  background: #fee2e2;
  color: var(--red);
}
.dline.removed .pfx {
  color: var(--red);
}
.dline.removed .ct {
  color: #991b1b;
}
.dline.added {
  background: #f0fdf4;
}
.dline.added .ln {
  background: #dcfce7;
  color: var(--green);
}
.dline.added .pfx {
  color: var(--green);
}
.dline.added .ct {
  color: #166534;
}
.dline.empty {
  background: #f9fafb;
}
.dline.empty .ln {
  background: #f3f4f6;
}
.dline.empty .pfx {
  color: transparent;
}
.dline.normal .pfx {
  color: transparent;
}
.dline.header {
  background: #eff6ff;
}
.dline.header .ct {
  color: #3b82f6;
  font-weight: 600;
}
.dline.fold {
  cursor: pointer;
  background: var(--bg-input);
}
.dline.fold:hover {
  background: var(--bg-hover);
}
.dline.fold .ln {
  background: var(--bg-side);
  justify-content: center;
  color: var(--text-muted);
  font-weight: 700;
}
.dline.fold .pfx {
  color: transparent;
}
.dline.fold .ct {
  color: var(--text-muted);
}
.inline-view {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex: 1;
  min-height: 0;
}
.inline-scroll {
  flex: 1;
  overflow: auto;
  background: #fff;
}
.uline {
  display: flex;
  min-height: 19.2px;
  white-space: pre;
  font-family: 'JetBrains Mono', Consolas, monospace;
  font-size: 12px;
  line-height: 1.6;
}
.uln {
  width: 40px;
  min-width: 40px;
  padding-right: 8px;
  text-align: right;
  user-select: none;
  background: var(--bg-side);
  border-right: 1px solid var(--border);
  color: var(--text-muted);
  flex-shrink: 0;
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
}
.upfx {
  width: 16px;
  min-width: 16px;
  text-align: center;
  flex-shrink: 0;
  user-select: none;
  font-weight: 700;
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.uct {
  flex: 1;
  padding-left: 4px;
  min-width: 0;
  white-space: pre;
  overflow: visible;
}
.uline.normal {
  color: var(--text-primary);
}
.uline.normal .upfx {
  color: transparent;
}
.uline.removed {
  background: #fef2f2;
  color: #991b1b;
}
.uline.removed .uln {
  background: #fee2e2;
  color: var(--red);
}
.uline.removed .upfx {
  color: var(--red);
}
.uline.added {
  background: #f0fdf4;
  color: #166534;
}
.uline.added .uln {
  background: #dcfce7;
  color: var(--green);
}
.uline.added .upfx {
  color: var(--green);
}
.uline.empty {
  background: #f9fafb;
}
.uline.empty .upfx {
  color: transparent;
}
.uline.fold {
  cursor: pointer;
  background: var(--bg-input);
  color: var(--text-muted);
}
.uline.fold:hover {
  background: var(--bg-hover);
}
.uline.fold .upfx {
  color: transparent;
}
.char-add {
  background: #bbf7d0;
  border-radius: 2px;
  padding: 0 1px;
}
.char-del {
  background: #fecaca;
  border-radius: 2px;
  padding: 0 1px;
  text-decoration: line-through;
}
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  font-size: 13px;
  padding: 40px;
  gap: 6px;
}
.empty-title {
  margin: 0;
  font-size: 14px;
  color: var(--text-secondary);
}
.diff-statusbar {
  height: 26px;
  min-height: 26px;
  background: var(--bg-titlebar);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 14px;
  font-size: 11px;
  color: var(--text-muted);
  user-select: none;
  border-top: 1px solid var(--border);
  flex-shrink: 0;
}
.sb-left,
.sb-right {
  display: flex;
  align-items: center;
  gap: 14px;
}
.sb-item {
  display: flex;
  align-items: center;
  gap: 4px;
}
.sb-add {
  color: var(--green);
  font-weight: 600;
  font-family: 'JetBrains Mono', Consolas, monospace;
}
.sb-del {
  color: var(--red);
  font-weight: 600;
  font-family: 'JetBrains Mono', Consolas, monospace;
}
</style>
