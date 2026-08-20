import * as monaco from 'monaco-editor'
import 'monaco-editor/esm/vs/basic-languages/markdown/markdown.contribution'
import 'monaco-editor/esm/vs/basic-languages/yaml/yaml.contribution'
import { conf as htmlConf, language as htmlLanguage } from 'monaco-editor/esm/vs/basic-languages/html/html'

const LANG_BY_EXT = {
  ts: 'typescript', tsx: 'typescript', js: 'javascript', mjs: 'javascript', cjs: 'javascript',
  json: 'json', vue: 'vue', html: 'html', htm: 'html',
  css: 'css', scss: 'css',
  md: 'markdown', yml: 'yaml', yaml: 'yaml', txt: 'plaintext'
}

const LABEL_BY_LANG = {
  typescript: 'TypeScript',
  javascript: 'JavaScript',
  json: 'JSON',
  html: 'HTML',
  css: 'CSS',
  markdown: 'Markdown',
  yaml: 'YAML',
  plaintext: '纯文本'
}

export function getExtension(path) {
  const name = (path || '').split(/[\\/]/).pop() || ''
  return (name.split('.').pop() || '').toLowerCase()
}

export function getLanguage(path) {
  return LANG_BY_EXT[getExtension(path)] || 'plaintext'
}

export function getLanguageLabel(path) {
  return LABEL_BY_LANG[getLanguage(path)] || '纯文本'
}

export function registerVueLanguage() {
  if (monaco.languages.getLanguages().some(l => l.id === 'vue')) return
  monaco.languages.register({ id: 'vue', extensions: ['.vue'] })
  monaco.languages.setMonarchTokensProvider('vue', htmlLanguage)
  monaco.languages.setLanguageConfiguration('vue', htmlConf)
}

export function ensureExtraLanguages() {
  registerVueLanguage()
}

export default monaco
