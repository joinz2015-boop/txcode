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
      </div>
    </aside>

    <main class="flex-1 flex flex-col bg-[#1e1e1e] min-w-0">
      <div v-show="subTab === 'project'" class="flex-1 p-6 overflow-y-auto">
        <ProjectSkills :skills="filteredSkills" />
      </div>

      <div v-show="subTab === 'system'" class="flex-1 p-6 overflow-y-auto">
        <SystemSkills :skills="systemSkills" />
      </div>

      <div v-show="subTab === 'remote'" class="flex-1 p-6 overflow-y-auto">
        <RemoteSpecs
          :repositories="repositories"
          :repo-specs="repoSpecs"
          :loading-specs="loadingSpecs"
          :downloading-all="downloadingAll"
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
    </main>

    <SpecRepositoryDialog
      :visible.sync="showAddDialog"
      :repository="editingRepo"
      @submit="handleSubmitRepo"
      @close="editingRepo = null"
    />

    <SpecViewer
      :visible.sync="showSpecViewer"
      :spec="currentSpec"
      :content="currentSpecContent"
    />
  </div>
</template>

<script>
import { api } from '../api'
import ProjectSkills from '../components/ProjectSkills.vue'
import SystemSkills from '../components/SystemSkills.vue'
import RemoteSpecs from '../components/RemoteSpecs.vue'
import LocalSpecsList from '../components/LocalSpecsList.vue'
import SpecRepositoryDialog from '../components/SpecRepositoryDialog.vue'
import SpecViewer from '../components/SpecViewer.vue'

export default {
  name: 'Skills',
  components: {
    ProjectSkills,
    SystemSkills,
    RemoteSpecs,
    LocalSpecsList,
    SpecRepositoryDialog,
    SpecViewer
  },
  data() {
    return {
      subTab: 'project',
      filterText: '',
      skills: [],
      systemSkills: [],
      repositories: [],
      repoSpecs: {},
      loadingSpecs: {},
      downloadingAll: {},
      localSpecs: [],
      showAddDialog: false,
      editingRepo: null,
      showSpecViewer: false,
      currentSpec: null,
      currentSpecContent: '',
      projectPath: ''
    }
  },
  computed: {
    filteredSkills() {
      if (!this.filterText) return this.skills
      const lower = this.filterText.toLowerCase()
      return this.skills.filter(s => 
        s.name.toLowerCase().includes(lower) ||
        s.description?.toLowerCase().includes(lower)
      )
    }
  },
  async created() {
    await this.loadSkills()
    await this.loadRepositories()
    await this.loadLocalSpecs()
    await this.loadProjectPath()
  },
  methods: {
    async loadSkills() {
      try {
        const res = await api.getSkills()
        this.skills = res.data || []
        this.systemSkills = []
      } catch (e) {
        console.error('Failed to load skills:', e)
        this.skills = []
        this.systemSkills = []
      }
    },
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
        this.$set(this.downloadingAll, repoId, true);
        const res = await api.downloadAllSpecs(repoId, this.projectPath);
        this.$message.success(`Downloaded ${res.data?.downloaded?.length || 0} specs to ${res.data?.projectPath || this.projectPath}`);
        await this.loadLocalSpecs();
      } catch (e) {
        console.error('Failed to download all specs:', e);
        this.$message.error('Download failed: ' + (e.message || 'Unknown error'));
      } finally {
        this.$set(this.downloadingAll, repoId, false);
      }
    }
  }
}
</script>
