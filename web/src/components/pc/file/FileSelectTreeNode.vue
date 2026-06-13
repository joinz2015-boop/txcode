<template>
  <div class="file-tree-node">
    <div 
      class="node-content" 
      :style="{ paddingLeft: (level * 16 + 4) + 'px' }"
      :class="{ selected: isSelected, directory: node.is_directory }"
      @click="handleClick"
      @dblclick="handleDblClick"
    >
      <span class="expand-icon" v-if="node.is_directory" @click.stop="toggleExpand">
        <i v-if="loading" class="fa-solid fa-spinner fa-spin"></i>
        <i v-else-if="expanded" class="fa-solid fa-chevron-down"></i>
        <i v-else-if="node.has_children || (node.children && node.children.length > 0)" class="fa-solid fa-chevron-right"></i>
        <span v-else class="placeholder"></span>
      </span>
      <span class="expand-icon placeholder" v-else></span>
      
      <span class="node-icon">
        <i :class="getFileIcon(node.name, node.is_directory)"></i>
      </span>
      
      <span class="node-name">{{ node.name }}</span>
    </div>
    
    <div v-if="node.is_directory && expanded && (loadedChildren.length > 0 || node.children?.length > 0)" class="children">
      <file-select-tree-node
        v-for="child in (loadedChildren.length > 0 ? loadedChildren : node.children)"
        :key="child.path"
        :node="child"
        :level="level + 1"
        :selected-path="selectedPath"
        @select="$emit('select', $event)"
        @enter-dir="$emit('enter-dir', $event)"
        @load-children="$emit('load-children', $event)"
      />
    </div>
  </div>
</template>

<script>
export default {
  name: 'FileSelectTreeNode',
  props: {
    node: {
      type: Object,
      required: true
    },
    level: {
      type: Number,
      default: 0
    },
    selectedPath: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      expanded: false,
      loading: false,
      loadedChildren: this.node.children || []
    }
  },
  computed: {
    isSelected() {
      return this.selectedPath === this.node.path
    }
  },
  watch: {
    node: {
      immediate: true,
      handler(newNode) {
        if (newNode.children && newNode.children.length > 0) {
          this.loadedChildren = newNode.children
        }
      }
    }
  },
  methods: {
    async toggleExpand() {
      if (!this.node.is_directory) return
      
      if (!this.expanded && this.loadedChildren.length === 0 && this.node.has_children) {
        this.loading = true
        try {
          this.$emit('load-children', {
            path: this.node.path,
            callback: (children) => {
              this.loadedChildren = children
              this.expanded = true
              this.loading = false
            }
          })
        } catch (e) {
          console.error('Failed to load children:', e)
          this.loading = false
        }
      } else {
        this.expanded = !this.expanded
      }
    },
    
    handleClick() {
      this.$emit('select', this.node)
      if (this.node.is_directory) {
        this.toggleExpand()
      }
    },
    
    handleDblClick() {
      // 双击不做任何处理
    },

    getFileIcon(name, isDir) {
      if (isDir) return 'fa-solid fa-folder text-yellow-500'
      
      const ext = name.split('.').pop().toLowerCase()
      const nameLower = name.toLowerCase()
      
      const icons = {
        js: 'fa-brands fa-js text-yellow-400',
        jsx: 'fa-brands fa-react text-blue-400',
        ts: 'fa-brands fa-js text-blue-400',
        tsx: 'fa-brands fa-react text-blue-400',
        html: 'fa-brands fa-html5 text-orange-500',
        htm: 'fa-brands fa-html5 text-orange-500',
        css: 'fa-brands fa-css3 text-blue-400',
        scss: 'fa-brands fa-sass text-pink-400',
        sass: 'fa-brands fa-sass text-pink-400',
        vue: 'fa-brands fa-vuejs text-green-400',
        py: 'fa-brands fa-python text-blue-500',
        pyc: 'fa-brands fa-python text-gray-400',
        json: 'fa-solid fa-file-code text-yellow-300',
        yaml: 'fa-solid fa-file-code text-blue-300',
        yml: 'fa-solid fa-file-code text-blue-300',
        xml: 'fa-solid fa-file-code text-orange-300',
        md: 'fa-solid fa-file-lines text-gray-400',
        markdown: 'fa-solid fa-file-lines text-gray-400',
        sql: 'fa-solid fa-database text-gray-400',
        sh: 'fa-solid fa-terminal text-green-400',
        bash: 'fa-solid fa-terminal text-green-400',
        go: 'fa-brands fa-golang text-cyan-400',
        rs: 'fa-brands fa-rust text-orange-400',
        java: 'fa-brands fa-java text-red-400',
        kt: 'fa-brands fa-android text-purple-400',
        swift: 'fa-brands fa-apple text-blue-300',
        c: 'fa-solid fa-file-code text-blue-300',
        cpp: 'fa-solid fa-file-code text-blue-400',
        cc: 'fa-solid fa-file-code text-blue-400',
        h: 'fa-solid fa-file-code text-blue-300',
        hpp: 'fa-solid fa-file-code text-blue-400',
        cs: 'fa-brands fa-microsoft text-purple-400',
        rb: 'fa-solid fa-gem text-red-400',
        php: 'fa-brands fa-php text-purple-400',
        dockerfile: 'fa-brands fa-docker text-blue-400',
        gitignore: 'fa-brands fa-git text-red-400',
        gitattributes: 'fa-brands fa-git text-red-400',
        license: 'fa-solid fa-scale-balanced text-yellow-400',
        png: 'fa-solid fa-image text-green-400',
        jpg: 'fa-solid fa-image text-green-400',
        jpeg: 'fa-solid fa-image text-green-400',
        gif: 'fa-solid fa-image text-green-400',
        svg: 'fa-solid fa-image text-green-400',
        ico: 'fa-solid fa-image text-green-400',
        webp: 'fa-solid fa-image text-green-400',
        bmp: 'fa-solid fa-image text-green-400',
        mp4: 'fa-solid fa-film text-purple-400',
        avi: 'fa-solid fa-film text-purple-400',
        mov: 'fa-solid fa-film text-purple-400',
        mkv: 'fa-solid fa-film text-purple-400',
        mp3: 'fa-solid fa-music text-pink-400',
        wav: 'fa-solid fa-music text-pink-400',
        flac: 'fa-solid fa-music text-pink-400',
        woff: 'fa-solid fa-font text-blue-400',
        woff2: 'fa-solid fa-font text-blue-400',
        ttf: 'fa-solid fa-font text-blue-400',
        otf: 'fa-solid fa-font text-blue-400',
        eot: 'fa-solid fa-font text-blue-400',
        zip: 'fa-solid fa-file-zipper text-yellow-600',
        rar: 'fa-solid fa-file-zipper text-yellow-600',
        '7z': 'fa-solid fa-file-zipper text-yellow-600',
        tar: 'fa-solid fa-file-zipper text-yellow-600',
        gz: 'fa-solid fa-file-zipper text-yellow-600',
        pdf: 'fa-solid fa-file-pdf text-red-500',
        doc: 'fa-solid fa-file-word text-blue-600',
        docx: 'fa-solid fa-file-word text-blue-600',
        xls: 'fa-solid fa-file-excel text-green-600',
        xlsx: 'fa-solid fa-file-excel text-green-600',
        ppt: 'fa-solid fa-file-powerpoint text-orange-600',
        pptx: 'fa-solid fa-file-powerpoint text-orange-600'
      }
      
      if (nameLower === 'dockerfile') return icons.dockerfile
      if (nameLower === '.gitignore') return icons.gitignore
      if (nameLower === '.gitattributes') return icons.gitattributes
      if (nameLower === 'license' || nameLower.startsWith('license')) return icons.license
      if (nameLower.startsWith('readme')) return icons.md
      
      return icons[ext] || 'fa-solid fa-file text-gray-400'
    }
  }
}
</script>

<style lang="scss" scoped>
.file-tree-node {
  user-select: none;
}

.node-content {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  cursor: pointer;
  transition: background 0.1s;
  border-radius: 4px;
  margin: 1px 4px;
  
  &:hover {
    background: rgba(255, 255, 255, 0.05);
  }
  
  &.selected {
    background: rgba(255, 255, 255, 0.1);
  }
}

.expand-icon {
  width: 16px;
  text-align: center;
  font-size: 10px;
  color: #858585;
  flex-shrink: 0;
  
  &.placeholder,
  .placeholder {
    visibility: hidden;
    display: inline-block;
    width: 10px;
  }
  
  i {
    font-size: 10px;
  }
}

.node-icon {
  margin: 0 6px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
}

.node-name {
  color: #cccccc;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.children {
}
</style>
