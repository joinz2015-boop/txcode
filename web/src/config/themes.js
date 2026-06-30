const PRESET_THEMES = [
  {
    id: 'default-dark',
    name: '默认暗色',
    desc: '经典蓝 · VS Code 风格',
    colors: {
      accent: '#409EFF',
      sidebar: '#2d2d2d',
      activityBar: '#333333',
      active: 'rgba(64,158,255,0.125)',
      border: '#404040',
      textMain: '#cccccc',
      textMuted: '#858585',
      primary: '#409EFF',
      panel: '#0a0a09',
      panelHeader: '#121212',
      inputBg: '#18191b',
      contentBg: '#1e1e1e',
      hoverBg: '#2a2a2a'
    }
  },
  {
    id: 'emerald-dark',
    name: '翡翠暗绿',
    desc: '护眼绿 · 长时间编码',
    colors: {
      accent: '#27ae60',
      sidebar: '#1a2420',
      activityBar: '#121a16',
      active: 'rgba(39,174,96,0.125)',
      border: '#2d3d33',
      textMain: '#c8d6ce',
      textMuted: '#7d9a85',
      primary: '#27ae60',
      panel: '#080e0b',
      panelHeader: '#0f1613',
      inputBg: '#151b17',
      contentBg: '#1a221d',
      hoverBg: '#242e28'
    }
  },
  {
    id: 'sunset-dark',
    name: '日落暖橙',
    desc: '温暖活力 · 创意编码',
    colors: {
      accent: '#e67e22',
      sidebar: '#2a2520',
      activityBar: '#1e1a16',
      active: 'rgba(230,126,34,0.125)',
      border: '#4a3d30',
      textMain: '#d4cec3',
      textMuted: '#9a8c78',
      primary: '#e67e22',
      panel: '#0e0a06',
      panelHeader: '#15110c',
      inputBg: '#1b1712',
      contentBg: '#211c17',
      hoverBg: '#2d2823'
    }
  },
  {
    id: 'lavender-dark',
    name: '薰衣草紫',
    desc: '优雅紫调 · 设计感',
    colors: {
      accent: '#8e44ad',
      sidebar: '#241f2a',
      activityBar: '#19151f',
      active: 'rgba(142,68,173,0.125)',
      border: '#3d3350',
      textMain: '#cfc7db',
      textMuted: '#8a7ea0',
      primary: '#8e44ad',
      panel: '#0c0810',
      panelHeader: '#130f17',
      inputBg: '#19151d',
      contentBg: '#1f1b23',
      hoverBg: '#2b2730'
    }
  },
  {
    id: 'ocean-dark',
    name: '深海蓝调',
    desc: '沉稳深邃 · 专注模式',
    colors: {
      accent: '#2980b9',
      sidebar: '#1a2632',
      activityBar: '#111820',
      active: 'rgba(41,128,185,0.125)',
      border: '#2d3f52',
      textMain: '#c4d0db',
      textMuted: '#6d8299',
      primary: '#2980b9',
      panel: '#080e14',
      panelHeader: '#0f151b',
      inputBg: '#151b21',
      contentBg: '#1b2128',
      hoverBg: '#272e35'
    }
  },
  {
    id: 'forest-dark',
    name: '森林深色',
    desc: '自然舒适 · 低对比度',
    colors: {
      accent: '#4a8c5c',
      sidebar: '#1c221e',
      activityBar: '#131815',
      active: 'rgba(74,140,92,0.125)',
      border: '#314035',
      textMain: '#c2cdc5',
      textMuted: '#6b8a73',
      primary: '#4a8c5c',
      panel: '#080d0a',
      panelHeader: '#0f1410',
      inputBg: '#151a16',
      contentBg: '#1b201c',
      hoverBg: '#262b27'
    }
  },
  {
    id: 'monokai',
    name: 'Monokai',
    desc: '经典黄绿 · Sublime 风',
    colors: {
      accent: '#a6e22e',
      sidebar: '#272822',
      activityBar: '#1e1f1a',
      active: 'rgba(166,226,46,0.125)',
      border: '#49483e',
      textMain: '#f8f8f2',
      textMuted: '#75715e',
      primary: '#a6e22e',
      panel: '#0d0e09',
      panelHeader: '#14150f',
      inputBg: '#1a1b15',
      contentBg: '#20211b',
      hoverBg: '#2c2d27'
    }
  }
]

const STORAGE_KEY = 'txcode-theme'

function computeActive(accentHex) {
  const r = parseInt(accentHex.slice(1, 3), 16)
  const g = parseInt(accentHex.slice(3, 5), 16)
  const b = parseInt(accentHex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},0.125)`
}

function applyTheme(presetId) {
  const preset = PRESET_THEMES.find(p => p.id === presetId)
  if (!preset) return

  const root = document.documentElement

  document.body.classList.add('transition-theme')
  setTimeout(() => document.body.classList.remove('transition-theme'), 400)

  const varMap = {
    accent: '--color-accent',
    sidebar: '--color-sidebar',
    activityBar: '--color-activityBar',
    active: '--color-active',
    border: '--color-border',
    textMain: '--color-textMain',
    textMuted: '--color-textMuted',
    primary: '--color-primary',
    panel: '--color-panel',
    panelHeader: '--color-panelHeader',
    inputBg: '--color-inputBg',
    contentBg: '--color-contentBg',
    hoverBg: '--color-hoverBg'
  }

  Object.entries(varMap).forEach(([key, cssVar]) => {
    const val = preset.colors[key]
    if (val) {
      root.style.setProperty(cssVar, val)
    }
  })

  if (!preset.colors.active) {
    root.style.setProperty('--color-active', computeActive(preset.colors.accent))
  }
}

function getSavedTheme() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const data = JSON.parse(raw)
      return data.preset || data
    }
  } catch (e) {
    // ignore
  }
  return null
}

function saveTheme(presetId) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ preset: presetId }))
}

export { PRESET_THEMES, computeActive, applyTheme, getSavedTheme, saveTheme }
