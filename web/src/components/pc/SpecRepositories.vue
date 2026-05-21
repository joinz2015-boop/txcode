<template>
  <div class="spec-repositories">
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-lg text-white font-light">Remote Repositories</h3>
      <el-button type="primary" size="small" @click="$emit('add')">
        <i class="fa-solid fa-plus mr-1"></i> Add Repository
      </el-button>
    </div>

    <div v-if="repositories.length === 0" class="text-center text-textMuted py-8">
      <i class="fa-solid fa-server text-4xl mb-4 opacity-30"></i>
      <p>No repositories configured</p>
    </div>

    <div v-else class="space-y-2">
      <div
        v-for="repo in repositories"
        :key="repo.id"
        class="bg-sidebar border border-border rounded overflow-hidden"
      >
        <div class="repo-header p-3 flex items-center gap-3 cursor-pointer hover:bg-white/5" @click="toggleExpand(repo.id)">
          <span class="expand-icon text-textMuted text-xs transition-transform" :class="{ 'rotate-90': expandedRepos.has(repo.id) }">
            <i class="fa-solid fa-chevron-right"></i>
          </span>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="text-white font-medium text-sm truncate">{{ repo.name }}</span>
              <el-tag v-if="repo.isSynced" type="success" size="mini">Synced</el-tag>
              <el-tag v-else type="info" size="mini">Not Synced</el-tag>
            </div>
            <div class="text-textMuted text-xs truncate mt-1">{{ repo.url }}</div>
          </div>
          <div class="flex items-center gap-2">
            <el-button type="text" size="small" @click.stop="$emit('sync', repo)">Sync</el-button>
            <el-button type="text" size="small" @click.stop="$emit('edit', repo)">Edit</el-button>
            <el-button type="text" size="small" class="delete-btn" @click.stop="$emit('delete', repo.id)">Delete</el-button>
          </div>
        </div>

        <div class="specs-panel border-t border-border" :class="{ 'hidden': !expandedRepos.has(repo.id) }">
          <div class="p-3 bg-black/20">
            <div v-if="!repo.isSynced" class="text-textMuted text-xs">
              <i class="fa-solid fa-info-circle mr-1"></i> Click Sync to clone the repository
            </div>
            <div v-else>
              <div class="flex justify-between items-center mb-2">
                <div class="text-textMuted text-xs">
                  Last sync: {{ repo.last_sync_at ? new Date(repo.last_sync_at).toLocaleString() : 'Never' }}
                </div>
                <el-button 
                  v-if="repoSpecs[repo.id] && repoSpecs[repo.id].length > 0" 
                  type="text" 
                  size="small" 
                  @click.stop="$emit('download-all', repo.id)"
                  :loading="downloadingAll[repo.id]"
                >
                  Install All
                </el-button>
              </div>
              <div class="space-y-1">
                <div v-if="loadingSpecs[repo.id]" class="text-textMuted text-xs">
                  <i class="fa-solid fa-spinner fa-spin mr-1"></i> Loading specs...
                </div>
                <div v-else-if="!repoSpecs[repo.id] || repoSpecs[repo.id].length === 0" class="text-textMuted text-xs">
                  No specs found in this repository.
                </div>
                <div
                  v-else
                  v-for="spec in repoSpecs[repo.id]"
                  :key="spec.name"
                  class="flex items-center justify-between py-1"
                >
                  <div class="flex items-center gap-2">
                    <span class="text-sm text-textMain">{{ spec.name }}</span>
                    <el-tag v-if="spec.read_mode === 'required'" type="warning" size="mini">Required</el-tag>
                    <el-tag v-else type="info" size="mini">Optional</el-tag>
                  </div>
                  <el-button type="text" size="small" @click="$emit('download-spec', repo.id, spec.name)">Install</el-button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'SpecRepositories',
  props: {
    repositories: {
      type: Array,
      default: () => []
    },
    repoSpecs: {
      type: Object,
      default: () => ({})
    },
    loadingSpecs: {
      type: Object,
      default: () => ({})
    },
    downloadingAll: {
      type: Object,
      default: () => ({})
    }
  },
  data() {
    return {
      expandedRepos: new Set()
    }
  },
  methods: {
    toggleExpand(repoId) {
      if (this.expandedRepos.has(repoId)) {
        this.expandedRepos.delete(repoId)
      } else {
        this.expandedRepos.add(repoId)
        if (!this.repoSpecs[repoId]) {
          this.$emit('load-specs', repoId)
        }
      }
      this.expandedRepos = new Set(this.expandedRepos)
    }
  }
}
</script>

<style scoped>
.expand-icon {
  display: inline-block;
  width: 16px;
  text-align: center;
}
.expand-icon.rotate-90 {
  transform: rotate(90deg);
}
.delete-btn {
  color: #f56c6c !important;
}
</style>
