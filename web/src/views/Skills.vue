<template>
  <div class="flex-1 flex overflow-hidden">
    <aside class="w-[220px] bg-sidebar border-r border-border flex flex-col shrink-0 py-4">
      <div class="px-4 mb-4">
        <h2 class="text-white font-bold text-lg mb-1">Skills</h2>
        <input type="text" placeholder="Filter..." class="w-full bg-black/20 border border-border rounded px-2 py-1 text-xs">
      </div>
      <div class="flex-1 overflow-y-auto">
        <div class="px-4 py-1 text-xs font-bold text-textMuted uppercase mt-2">Configuration</div>
        <button
          @click="subTab = 'project'"
          class="w-full text-left px-4 py-2 flex items-center gap-2"
          :class="subTab === 'project' ? 'bg-active text-white border-l-2 border-accent' : 'text-textMuted hover:text-white hover:bg-white/5 border-l-2 border-transparent'"
        >
          <i class="fa-solid fa-folder-tree w-4 text-center"></i> Project Skills
        </button>
        <button
          @click="subTab = 'system'"
          class="w-full text-left px-4 py-2 flex items-center gap-2"
          :class="subTab === 'system' ? 'bg-active text-white border-l-2 border-accent' : 'text-textMuted hover:text-white hover:bg-white/5 border-l-2 border-transparent'"
        >
          <i class="fa-solid fa-globe w-4 text-center"></i> System Skills
        </button>
      </div>
    </aside>

    <main class="flex-1 flex flex-col bg-[#1e1e1e] min-w-0">
      <div v-show="subTab === 'project'" class="flex-1 p-6 overflow-y-auto">
        <div class="max-w-4xl mx-auto">
          <div class="flex justify-between items-center mb-6">
            <div>
              <h3 class="text-2xl text-white font-light">Project Skills</h3>
              <p class="text-textMuted text-xs mt-1">
                Skills specific to your project
              </p>
            </div>
          </div>

          <div v-if="skills.length === 0" class="text-center text-textMuted py-10">
            <i class="fa-solid fa-shapes text-4xl mb-4 opacity-30"></i>
            <p>暂无项目 Skills</p>
          </div>

          <div v-else class="space-y-3">
            <div
              v-for="skill in skills"
              :key="skill.name"
              class="bg-sidebar border border-border p-4 rounded flex justify-between items-start hover:border-accent group"
            >
              <div class="flex gap-4">
                <div class="w-10 h-10 rounded flex items-center justify-center text-xl bg-purple-900/30 text-purple-400">
                  <i class="fa-solid fa-shapes"></i>
                </div>
                <div>
                  <h4 class="text-white font-bold text-sm">{{ skill.name }}</h4>
                  <p class="text-textMuted text-xs h-10 overflow-hidden mt-1">{{ skill.description }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-show="subTab === 'system'" class="flex-1 p-6 overflow-y-auto">
        <h3 class="text-2xl text-white font-light mb-6">System Skills</h3>
        
        <div v-if="systemSkills.length === 0" class="text-center text-textMuted py-10">
          <i class="fa-solid fa-shapes text-4xl mb-4 opacity-30"></i>
          <p>暂无系统 Skills</p>
        </div>

        <div v-else class="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <label
            v-for="sysSkill in systemSkills"
            :key="sysSkill.name"
            class="bg-sidebar border border-border p-3 rounded flex items-center gap-3 cursor-pointer hover:bg-active"
          >
            <input type="checkbox" :checked="sysSkill.enabled" class="accent-accent">
            <span class="text-sm text-textMain">{{ sysSkill.name }}</span>
          </label>
        </div>
      </div>
    </main>
  </div>
</template>

<script>
import { api } from '../api'

export default {
  name: 'Skills',
  data() {
    return {
      subTab: 'project',
      skills: [],
      systemSkills: []
    }
  },
  async created() {
    await this.loadSkills()
  },
  methods: {
    async loadSkills() {
      try {
        const res = await api.getSkills()
        this.skills = res.data || []
        this.systemSkills = []
      } catch (e) {
        console.error('加载技能失败:', e)
        this.skills = []
        this.systemSkills = []
      }
    }
  }
}
</script>
