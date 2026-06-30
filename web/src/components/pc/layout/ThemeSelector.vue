<template>
  <el-dropdown @command="handleSelect" trigger="click">
    <span class="text-xs text-textMuted cursor-pointer hover:text-white">
      <i class="fa-solid fa-palette mr-1 text-accent"></i>
      {{ currentThemeName }}
      <i class="el-icon-arrow-down el-icon--right"></i>
    </span>
    <el-dropdown-menu slot="dropdown">
      <el-dropdown-item
        v-for="theme in themes"
        :key="theme.id"
        :command="theme.id"
        :class="{ 'text-accent': theme.id === activeTheme }"
      >
        <span
          class="inline-block w-3 h-3 rounded mr-2"
          :style="{ background: theme.colors.accent }"
        ></span>
        {{ theme.name }}
      </el-dropdown-item>
    </el-dropdown-menu>
  </el-dropdown>
</template>

<script>
import { PRESET_THEMES, applyTheme, getSavedTheme, saveTheme } from '@/config/themes.js'

export default {
  name: 'ThemeSelector',
  data() {
    return {
      activeTheme: getSavedTheme() || 'default-dark',
      themes: PRESET_THEMES
    }
  },
  computed: {
    currentThemeName() {
      const t = this.themes.find(t => t.id === this.activeTheme)
      return t ? t.name : '默认暗色'
    }
  },
  methods: {
    handleSelect(themeId) {
      this.activeTheme = themeId
      applyTheme(themeId)
      saveTheme(themeId)
    }
  },
  mounted() {
    applyTheme(this.activeTheme)
  }
}
</script>
