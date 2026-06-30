<template>
  <div class="flex-1 flex overflow-hidden">
    <aside class="w-[220px] bg-sidebar border-r border-border flex flex-col shrink-0 py-4">
      <div class="px-4 mb-4">
        <h2 class="text-white font-bold text-lg mb-1">Skills & Specs</h2>
        <input type="text" v-model="filterText" placeholder="Filter..." class="w-full bg-black/20 border border-border rounded px-2 py-1 text-xs">
      </div>
      <div class="flex-1 overflow-y-auto">
        <div class="px-4 py-1 text-xs font-bold text-textMuted uppercase mt-2">Skills</div>
        <button
          @click="subTab = 'market'"
          class="w-full text-left px-4 py-2 flex items-center gap-2"
          :class="subTab === 'market' ? 'bg-active text-white border-l-2 border-accent' : 'text-textMuted hover:text-white hover:bg-white/5 border-l-2 border-transparent'"
        >
          <i class="fa-solid fa-store w-4 text-center"></i> skill 市场
        </button>
        <div class="px-4 py-1 text-xs font-bold text-textMuted uppercase mt-4">Specs</div>
        <button
          @click="subTab = 'specMarket'"
          class="w-full text-left px-4 py-2 flex items-center gap-2"
          :class="subTab === 'specMarket' ? 'bg-active text-white border-l-2 border-accent' : 'text-textMuted hover:text-white hover:bg-white/5 border-l-2 border-transparent'"
        >
          <i class="fa-solid fa-store w-4 text-center"></i> 规范市场
        </button>

        <div class="px-4 py-1 text-xs font-bold text-textMuted uppercase mt-4">Memory</div>
        <button
          @click="subTab = 'memory'"
          class="w-full text-left px-4 py-2 flex items-center gap-2"
          :class="subTab === 'memory' ? 'bg-active text-white border-l-2 border-accent' : 'text-textMuted hover:text-white hover:bg-white/5 border-l-2 border-transparent'"
        >
          <i class="fa-solid fa-brain w-4 text-center"></i> 记忆
        </button>
      </div>
    </aside>

    <main class="flex-1 flex flex-col bg-[#1e1e1e] min-w-0">
      <div v-show="subTab === 'market'" class="flex-1 p-6 overflow-hidden flex flex-col">
        <SkillMarket
          ref="skillMarket"
          :local-skills="localSkills"
          :project-path="projectPath"
          @refresh-local="loadLocalSkills"
          @view="handleViewSkill"
        />
      </div>

      <div v-show="subTab === 'specMarket'" class="flex-1 p-6 overflow-hidden flex flex-col">
        <SpecMarket
          ref="specMarket"
          :local-specs="localSpecs"
          :project-path="projectPath"
          @refresh-local="loadLocalSpecs"
          @view="handleViewSpec"
        />
      </div>

      <div v-show="subTab === 'memory'" class="flex-1 flex flex-col overflow-hidden">
        <div class="flex items-center justify-between px-6 py-3 border-b border-border">
          <h2 class="text-lg font-bold text-white">记忆</h2>
          <el-button size="small" @click="openMemoryEdit">
            <i class="fa-solid fa-pen"></i>
          </el-button>
        </div>
        <div class="flex-1 p-6 overflow-y-auto">
          <MemoryDisplay :items="memoryItems" />
        </div>
      </div>
    </main>

    <SpecViewer
      :visible.sync="showSpecViewer"
      :spec="currentSpec"
      :content="currentSpecContent"
    />

    <SkillViewer
      :visible.sync="showSkillViewer"
      :skill="currentSkill"
      :content="currentSkillContent"
    />

    <MemoryEditDialog
      :visible.sync="showMemoryEdit"
      :content="memoryRawContent"
      @save="handleSaveMemory"
    />
  </div>
</template>

<script>
import { api } from '../../../api'
import SkillMarket from '../../../components/pc/skill/SkillMarket.vue'
import SkillViewer from '../../../components/pc/skill/SkillViewer.vue'
import SpecMarket from '../../../components/pc/spec/SpecMarket.vue'
import SpecViewer from '../../../components/pc/spec/SpecViewer.vue'
import MemoryDisplay from '../../../components/pc/memory/MemoryDisplay.vue'
import MemoryEditDialog from '../../../components/pc/memory/MemoryEditDialog.vue'

export default {
  name: 'Skills',
  components: {
    SkillMarket,
    SkillViewer,
    SpecMarket,
    SpecViewer,
    MemoryDisplay,
    MemoryEditDialog
  },
  data() {
    return {
      subTab: 'market',
      filterText: '',
      localSkills: [],
      localSpecs: [],
      showSpecViewer: false,
      currentSpec: null,
      currentSpecContent: '',
      showSkillViewer: false,
      currentSkill: null,
      currentSkillContent: '',
      projectPath: '',
      memoryItems: [],
      memoryRawContent: '',
      showMemoryEdit: false
    }
  },
  watch: {
    subTab(val) {
      if (val === 'memory' && this.projectPath) {
        this.loadMemory()
      }
    }
  },
  async created() {
    await this.loadProjectPath()
    await this.loadLocalSkills()
    await this.loadLocalSpecs()
    if (this.subTab === 'memory') {
      await this.loadMemory()
    }
  },
  methods: {
    async loadProjectPath() {
      try {
        const res = await api.getProjectPath()
        if (res.success && res.data) {
          this.projectPath = res.data.path || ''
        }
      } catch (e) {
        console.error('Failed to load project path:', e)
      }
    },
    async loadLocalSkills() {
      try {
        const res = await api.getLocalSkills(this.projectPath)
        this.localSkills = res.data || []
      } catch (e) {
        console.error('Failed to load local skills:', e)
        this.localSkills = []
      }
    },
    async handleViewSkill(skill) {
      try {
        const res = await api.getSkillContent(skill.name)
        this.currentSkill = skill
        this.currentSkillContent = res.data
        this.showSkillViewer = true
      } catch (e) {
        console.error('Failed to load skill content:', e)
        this.$message.error('Failed to load skill content')
      }
    },
    // ==================== Specs ====================
    async loadLocalSpecs() {
      try {
        const res = await api.getLocalSpecs(this.projectPath)
        this.localSpecs = res.data?.specs || []
      } catch (e) {
        console.error('Failed to load local specs:', e)
        this.localSpecs = []
      }
    },
    async handleViewSpec(spec) {
      try {
        const res = await api.getSpecContent(spec.name)
        this.currentSpec = spec
        this.currentSpecContent = res.data
        this.showSpecViewer = true
      } catch (e) {
        console.error('Failed to load spec content:', e)
        this.$message.error('Failed to load spec content')
      }
    },
    // ==================== Memory (unchanged) ====================
    async loadMemory() {
      try {
        const res = await api.getMemory(this.projectPath);
        this.memoryItems = res.data?.items || [];
        this.memoryRawContent = res.data?.rawContent || '';
      } catch (e) {
        console.error('Failed to load memory:', e);
        this.memoryItems = [];
        this.memoryRawContent = '';
      }
    },
    openMemoryEdit() {
      this.showMemoryEdit = true;
    },
    async handleSaveMemory(content) {
      try {
        await api.saveMemory(this.projectPath, content);
        await this.loadMemory();
        this.$message.success('Memory saved');
      } catch (e) {
        console.error('Failed to save memory:', e);
        this.$message.error('Failed to save memory');
      }
    }
  }
}
</script>
