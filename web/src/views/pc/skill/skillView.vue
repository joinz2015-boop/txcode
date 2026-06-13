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
          @click="subTab = 'remoteSkills'"
          class="w-full text-left px-4 py-2 flex items-center gap-2"
          :class="subTab === 'remoteSkills' ? 'bg-active text-white border-l-2 border-accent' : 'text-textMuted hover:text-white hover:bg-white/5 border-l-2 border-transparent'"
        >
          <i class="fa-solid fa-server w-4 text-center"></i> Remote Skills
        </button>
        <button
          @click="subTab = 'localSkills'"
          class="w-full text-left px-4 py-2 flex items-center gap-2"
          :class="subTab === 'localSkills' ? 'bg-active text-white border-l-2 border-accent' : 'text-textMuted hover:text-white hover:bg-white/5 border-l-2 border-transparent'"
        >
          <i class="fa-solid fa-folder w-4 text-center"></i> Local Skills
        </button>

        <div class="px-4 py-1 text-xs font-bold text-textMuted uppercase mt-4">Specs</div>
        <button
          @click="subTab = 'remote'"
          class="w-full text-left px-4 py-2 flex items-center gap-2"
          :class="subTab === 'remote' ? 'bg-active text-white border-l-2 border-accent' : 'text-textMuted hover:text-white hover:bg-white/5 border-l-2 border-transparent'"
        >
          <i class="fa-solid fa-server w-4 text-center"></i> Remote Specs
        </button>
        <button
          @click="subTab = 'local'"
          class="w-full text-left px-4 py-2 flex items-center gap-2"
          :class="subTab === 'local' ? 'bg-active text-white border-l-2 border-accent' : 'text-textMuted hover:text-white hover:bg-white/5 border-l-2 border-transparent'"
        >
          <i class="fa-solid fa-folder w-4 text-center"></i> Local Specs
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
      <div v-show="subTab === 'remoteSkills'" class="flex-1 p-6 overflow-y-auto">
        <RemoteSkills
          :repositories="skillRepositories"
          :repo-skills="repoSkills"
          :loading-skills="loadingSkills"
          :downloading-all="downloadingAll"
          @add="showAddSkillDialog = true"
          @edit="handleEditSkillRepo"
          @delete="handleDeleteSkillRepo"
          @sync="handleSyncSkillRepo"
          @load-skills="loadRepoSKills"
          @download-skill="handleDownloadSkill"
          @download-all="handleDownloadAllSkills"
        />
      </div>

      <div v-show="subTab === 'localSkills'" class="flex-1 p-6 overflow-y-auto">
        <LocalSkillsList
          :skills="localSkills"
          @view="handleViewSkill"
          @delete="handleDeleteLocalSkill"
        />
      </div>

      <div v-show="subTab === 'remote'" class="flex-1 p-6 overflow-y-auto">
        <RemoteSpecs
          :repositories="repositories"
          :repo-specs="repoSpecs"
          :loading-specs="loadingSpecs"
          :downloading-all="downloadingAllSpecs"
          @add="showAddDialog = true"
          @edit="handleEditRepo"
          @delete="handleDeleteRepo"
          @sync="handleSyncRepo"
          @load-specs="loadRepoSpecs"
          @download-spec="handleDownloadSpec"
          @download-all="handleDownloadAll"
        />
      </div>

      <div v-show="subTab === 'local'" class="flex-1 p-6 overflow-y-auto">
        <LocalSpecsList
          :specs="localSpecs"
          @view="handleViewSpec"
          @delete="handleDeleteSpec"
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

    <SpecRepositoryDialog
      :visible.sync="showAddDialog"
      :repository="editingRepo"
      @submit="handleSubmitRepo"
      @close="editingRepo = null"
    />

    <SkillRepositoryDialog
      :visible.sync="showAddSkillDialog"
      :repository="editingSkillRepo"
      @submit="handleSubmitSkillRepo"
      @close="editingSkillRepo = null"
    />

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
import RemoteSkills from '../../../components/pc/skill/RemoteSkills.vue'
import LocalSkillsList from '../../../components/pc/skill/LocalSkillsList.vue'
import SkillRepositoryDialog from '../../../components/pc/skill/SkillRepositoryDialog.vue'
import SkillViewer from '../../../components/pc/skill/SkillViewer.vue'
import RemoteSpecs from '../../../components/pc/spec/RemoteSpecs.vue'
import LocalSpecsList from '../../../components/pc/spec/LocalSpecsList.vue'
import SpecRepositoryDialog from '../../../components/pc/spec/SpecRepositoryDialog.vue'
import SpecViewer from '../../../components/pc/spec/SpecViewer.vue'
import MemoryDisplay from '../../../components/pc/memory/MemoryDisplay.vue'
import MemoryEditDialog from '../../../components/pc/memory/MemoryEditDialog.vue'

export default {
  name: 'Skills',
  components: {
    RemoteSkills,
    LocalSkillsList,
    SkillRepositoryDialog,
    SkillViewer,
    RemoteSpecs,
    LocalSpecsList,
    SpecRepositoryDialog,
    SpecViewer,
    MemoryDisplay,
    MemoryEditDialog
  },
  data() {
    return {
      subTab: 'remoteSkills',
      filterText: '',
      skillRepositories: [],
      repoSkills: {},
      loadingSkills: {},
      downloadingAll: {},
      localSkills: [],
      repositories: [],
      repoSpecs: {},
      loadingSpecs: {},
      downloadingAllSpecs: {},
      localSpecs: [],
      showAddDialog: false,
      editingRepo: null,
      showAddSkillDialog: false,
      editingSkillRepo: null,
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
  computed: {
    filteredSkills() {
      if (!this.filterText) return this.localSkills
      const lower = this.filterText.toLowerCase()
      return this.localSkills.filter(s =>
        s.name.toLowerCase().includes(lower) ||
        s.description?.toLowerCase().includes(lower)
      )
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
    await this.loadSkillRepositories()
    await this.loadLocalSkills()
    await this.loadRepositories()
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
          this.projectPath = res.data.projectPath || ''
        }
      } catch (e) {
        console.error('Failed to load project path:', e)
      }
    },
    // ==================== Skills - Remote ====================
    async loadSkillRepositories() {
      try {
        const res = await api.getSkillRepositories()
        this.skillRepositories = res.data || []
      } catch (e) {
        console.error('Failed to load skill repositories:', e)
        this.skillRepositories = []
      }
    },
    async loadRepoSKills(repoId) {
      this.$set(this.loadingSkills, repoId, true)
      try {
        const res = await api.getRemoteSkills(repoId)
        this.$set(this.repoSkills, repoId, res.data || [])
      } catch (e) {
        console.error('Failed to load repo skills:', e)
        this.$set(this.repoSkills, repoId, [])
      } finally {
        this.$set(this.loadingSkills, repoId, false)
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
    handleEditSkillRepo(repo) {
      this.editingSkillRepo = repo
      this.showAddSkillDialog = true
    },
    async handleSubmitSkillRepo(data) {
      try {
        if (data.id) {
          await api.updateSkillRepository(data.id, data)
        } else {
          await api.createSkillRepository(data)
        }
        await this.loadSkillRepositories()
        this.editingSkillRepo = null
      } catch (e) {
        console.error('Failed to submit skill repository:', e)
        this.$message.error('Failed to submit repository')
      }
    },
    async handleDeleteSkillRepo(id) {
      try {
        await this.$confirm('Are you sure you want to delete this repository?', 'Confirm', {
          type: 'warning'
        })
        await api.deleteSkillRepository(id)
        await this.loadSkillRepositories()
        this.$message.success('Repository deleted')
      } catch (e) {
        if (e !== 'cancel') {
          console.error('Failed to delete repository:', e)
        }
      }
    },
    async handleSyncSkillRepo(repo) {
      try {
        const loading = this.$message.loading?.('Syncing repository...') || (() => {});
        const result = await api.syncSkillRepository(repo.id)
        loading()
        if (result.success) {
          this.$message.success(result.message || 'Sync completed')
          await this.loadSkillRepositories()
          await this.loadRepoSKills(repo.id)
        } else {
          this.$message.error(result.message || 'Sync failed')
        }
      } catch (e) {
        console.error('Failed to sync repository:', e)
        this.$message.error('Sync failed')
      }
    },
    async handleDownloadSkill(repoId, skillName) {
      try {
        const res = await api.downloadSkill(repoId, skillName, this.projectPath)
        this.$message.success(`Downloaded ${skillName} to ${res.data?.projectPath || this.projectPath}`)
        await this.loadLocalSkills()
      } catch (e) {
        console.error('Failed to download skill:', e)
        this.$message.error('Download failed: ' + (e.message || 'Unknown error'))
      }
    },
    async handleDownloadAllSkills(repoId) {
      try {
        this.$set(this.downloadingAll, repoId, true);
        const res = await api.downloadAllSkills(repoId, this.projectPath);
        this.$message.success(`Downloaded ${res.data?.downloaded?.length || 0} skills to ${res.data?.projectPath || this.projectPath}`);
        await this.loadLocalSkills();
      } catch (e) {
        console.error('Failed to download all skills:', e);
        this.$message.error('Download failed: ' + (e.message || 'Unknown error'));
      } finally {
        this.$set(this.downloadingAll, repoId, false);
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
    async handleDeleteLocalSkill(name) {
      try {
        await this.$confirm(`Are you sure you want to delete "${name}"?`, 'Confirm', {
          type: 'warning'
        })
        await api.deleteLocalSkill(name)
        await this.loadLocalSkills()
        this.$message.success('Skill deleted')
      } catch (e) {
        if (e !== 'cancel') {
          console.error('Failed to delete skill:', e)
        }
      }
    },
    // ==================== Specs (unchanged) ====================
    async loadRepositories() {
      try {
        const res = await api.getSpecRepositories()
        this.repositories = res.data || []
      } catch (e) {
        console.error('Failed to load repositories:', e)
        this.repositories = []
      }
    },
    async loadLocalSpecs() {
      try {
        const res = await api.getLocalSpecs(this.projectPath)
        this.localSpecs = res.data?.specs || []
      } catch (e) {
        console.error('Failed to load local specs:', e)
        this.localSpecs = []
      }
    },
    async loadRepoSpecs(repoId) {
      this.$set(this.loadingSpecs, repoId, true)
      try {
        const res = await api.getRepoSpecs(repoId)
        this.$set(this.repoSpecs, repoId, res.data || [])
      } catch (e) {
        console.error('Failed to load repo specs:', e)
        this.$set(this.repoSpecs, repoId, [])
      } finally {
        this.$set(this.loadingSpecs, repoId, false)
      }
    },
    handleEditRepo(repo) {
      this.editingRepo = repo
      this.showAddDialog = true
    },
    async handleSubmitRepo(data) {
      try {
        if (data.id) {
          await api.updateSpecRepository(data.id, data)
        } else {
          await api.createSpecRepository(data)
        }
        await this.loadRepositories()
        this.editingRepo = null
      } catch (e) {
        console.error('Failed to submit repository:', e)
        this.$message.error('Failed to submit repository')
      }
    },
    async handleDeleteRepo(id) {
      try {
        await this.$confirm('Are you sure you want to delete this repository?', 'Confirm', {
          type: 'warning'
        })
        await api.deleteSpecRepository(id)
        await this.loadRepositories()
        this.$message.success('Repository deleted')
      } catch (e) {
        if (e !== 'cancel') {
          console.error('Failed to delete repository:', e)
        }
      }
    },
    async handleSyncRepo(repo) {
      try {
        const loading = this.$message.loading?.('Syncing repository...') || (() => {});
        const result = await api.syncSpecRepository(repo.id)
        loading()
        if (result.success) {
          this.$message.success(result.message || 'Sync completed')
          await this.loadRepositories()
          await this.loadRepoSpecs(repo.id)
        } else {
          this.$message.error(result.message || 'Sync failed')
        }
      } catch (e) {
        console.error('Failed to sync repository:', e)
        this.$message.error('Sync failed')
      }
    },
    async handleDownloadSpec(repoId, specName) {
      try {
        const res = await api.downloadSpec(repoId, specName, this.projectPath)
        this.$message.success(`Downloaded ${specName} to ${res.data?.projectPath || this.projectPath}`)
        await this.loadLocalSpecs()
      } catch (e) {
        console.error('Failed to download spec:', e)
        this.$message.error('Download failed: ' + (e.message || 'Unknown error'))
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
    async handleDeleteSpec(name) {
      try {
        await this.$confirm(`Are you sure you want to delete "${name}"?`, 'Confirm', {
          type: 'warning'
        })
        await api.deleteLocalSpec(name)
        await this.loadLocalSpecs()
        this.$message.success('Spec deleted')
      } catch (e) {
        if (e !== 'cancel') {
          console.error('Failed to delete spec:', e)
        }
      }
    },
    async handleDownloadAll(repoId) {
      try {
        this.$set(this.downloadingAllSpecs, repoId, true);
        const res = await api.downloadAllSpecs(repoId, this.projectPath);
        this.$message.success(`Downloaded ${res.data?.downloaded?.length || 0} specs to ${res.data?.projectPath || this.projectPath}`);
        await this.loadLocalSpecs();
      } catch (e) {
        console.error('Failed to download all specs:', e);
        this.$message.error('Download failed: ' + (e.message || 'Unknown error'));
      } finally {
        this.$set(this.downloadingAllSpecs, repoId, false);
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
