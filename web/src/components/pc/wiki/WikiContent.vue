<template>
  <div class="wiki-content">
    <div v-if="loading" class="loading">
      <i class="fa-solid fa-spinner fa-spin"></i>
      <span>加载中...</span>
    </div>
    <div v-else-if="error" class="error">
      <i class="fa-solid fa-exclamation-triangle"></i>
      <span>{{ error }}</span>
    </div>
    <div v-else class="markdown-body" v-html="renderedContent"></div>
  </div>
</template>

<script>
import { marked } from 'marked';
import { api } from '@/api';

export default {
  name: 'WikiContent',
  props: {
    filePath: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      content: '',
      loading: false,
      error: ''
    };
  },
  computed: {
    renderedContent() {
      if (!this.content) return '';
      
      const renderer = new marked.Renderer();
      
      renderer.link = (href, title, text) => {
        if (href && href.endsWith('.md')) {
          const path = href.replace(/^\.\//, '').replace('.md', '.html');
          return `<a href="javascript:void(0)" onclick="window.__wikiNavigate__('${href}')" title="${title || ''}">${text}</a>`;
        }
        if (href && !href.startsWith('http')) {
          return `<a href="${href}" target="_blank" title="${title || ''}">${text}</a>`;
        }
        return `<a href="${href}" target="_blank" title="${title || ''}">${text}</a>`;
      };

      renderer.image = (href, title, text) => {
        let src = href;
        if (href && !href.startsWith('http') && !href.startsWith('/')) {
          const basePath = this.filePath.replace(/[^/\\]*$/, '');
          src = basePath + href;
        }
        return `<img src="${src}" alt="${text}" title="${title || ''}" />`;
      };

      marked.setOptions({
        renderer,
        gfm: true,
        breaks: true
      });

      return marked.parse(this.content);
    }
  },
  watch: {
    filePath: {
      immediate: true,
      handler(newPath) {
        if (newPath) {
          this.loadContent(newPath);
        }
      }
    }
  },
  methods: {
    async loadContent(path) {
      this.loading = true;
      this.error = '';
      this.content = '';
      
      try {
        const res = await api.getWikiContent(path);
        if (res.success) {
          this.content = res.data;
        } else {
          this.error = res.error || '加载文档失败';
        }
      } catch (error) {
        console.error('Failed to load wiki content:', error);
        this.error = '加载文档失败: ' + error.message;
      } finally {
        this.loading = false;
      }
    },
    setupNavigation() {
      window.__wikiNavigate__ = (path) => {
        const mdPath = path.replace(/^\.\//, '').replace('.md', '.html');
        this.$router.push({ name: 'wiki', query: { path: mdPath } });
      };
    }
  },
  mounted() {
    this.setupNavigation();
  },
  beforeDestroy() {
    if (window.__wikiNavigate__) {
      delete window.__wikiNavigate__;
    }
  }
};
</script>

<style scoped>
.wiki-content {
  flex: 1;
  padding: 24px 32px;
  overflow-y: auto;
  background: var(--color-panelHeader);
}

.loading,
.error {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 200px;
  color: var(--color-textMuted);
}

.error {
  color: #f56c6c;
}

.markdown-body {
  max-width: 900px;
  margin: 0 auto;
}

.markdown-body :deep(h1) {
  font-size: 2em;
  font-weight: 600;
  margin-bottom: 0.5em;
  padding-bottom: 0.3em;
  border-bottom: 1px solid var(--color-border);
}

.markdown-body :deep(h2) {
  font-size: 1.5em;
  font-weight: 600;
  margin-top: 1.5em;
  margin-bottom: 0.5em;
  padding-bottom: 0.3em;
  border-bottom: 1px solid var(--color-border);
}

.markdown-body :deep(h3) {
  font-size: 1.25em;
  font-weight: 600;
  margin-top: 1.2em;
  margin-bottom: 0.5em;
}

.markdown-body :deep(p) {
  margin: 0.8em 0;
  line-height: 1.8;
}

.markdown-body :deep(a) {
  color: var(--color-accent);
  text-decoration: none;
}

.markdown-body :deep(a:hover) {
  text-decoration: underline;
}

.markdown-body :deep(code) {
  padding: 0.2em 0.4em;
  background: var(--color-inputBg);
  border-radius: 3px;
  font-size: 85%;
  font-family: 'SF Mono', Consolas, monospace;
}

.markdown-body :deep(pre) {
  background: var(--color-inputBg);
  padding: 16px;
  border-radius: 6px;
  overflow-x: auto;
  margin: 1em 0;
}

.markdown-body :deep(pre code) {
  padding: 0;
  background: transparent;
  font-size: 85%;
}

.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  padding-left: 2em;
  margin: 0.8em 0;
}

.markdown-body :deep(li) {
  margin: 0.3em 0;
}

.markdown-body :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin: 1em 0;
}

.markdown-body :deep(th),
.markdown-body :deep(td) {
  border: 1px solid var(--color-border);
  padding: 8px 12px;
}

.markdown-body :deep(th) {
  background: var(--color-inputBg);
  font-weight: 600;
}

.markdown-body :deep(blockquote) {
  margin: 1em 0;
  padding: 0 1em;
  border-left: 4px solid var(--color-border);
  color: var(--color-textMuted);
}

.markdown-body :deep(img) {
  max-width: 100%;
  height: auto;
}
</style>
