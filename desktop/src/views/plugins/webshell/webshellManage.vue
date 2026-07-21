<template>
  <div class="manage-page">
    <div class="page-header">
      <div class="header-left">
        <button class="btn-back" @click="$router.push('/views/plugins/pluginsView')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <h2>WebShell 主机管理</h2>
      </div>
      <button class="btn-primary" @click="handleAdd">添加主机</button>
    </div>

    <div class="table-wrap" v-if="hosts.length > 0">
      <table class="data-table">
        <thead>
          <tr>
            <th>名称</th>
            <th>主机地址</th>
            <th>端口</th>
            <th>用户名</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="host in hosts" :key="host.id">
            <td>{{ host.name }}</td>
            <td>{{ host.host }}</td>
            <td>{{ host.port }}</td>
            <td>{{ host.username }}</td>
            <td class="action-cell">
              <button class="btn-link" @click="handleConnect(host)">连接</button>
              <button class="btn-link" @click="handleEdit(host)">编辑</button>
              <button class="btn-link btn-danger" @click="handleDelete(host)">删除</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-else class="empty-state">
      <p>暂无主机，点击"添加主机"开始</p>
    </div>

    <AddHostDialog
      v-model="dialogVisible"
      :host-data="currentHost"
      @success="fetchList"
    />

    <div class="overlay" v-if="deleteVisible" @click.self="deleteVisible = false">
      <div class="confirm-dialog">
        <div class="dialog-header"><span>删除确认</span></div>
        <div class="dialog-body">
          <p>确定要删除主机「{{ currentHost?.name }}」吗？</p>
        </div>
        <div class="dialog-footer">
          <button class="btn-outline" @click="deleteVisible = false">取消</button>
          <button class="btn-danger" @click="handleConfirmDelete" :disabled="deleteLoading">确定删除</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { listPluginHosts, deletePluginHost } from '@/api/plugins/pluginApi'
import AddHostDialog from '@/components/plugins/webshell/AddHostDialog.vue'

export default {
  name: 'webshellManage',
  components: { AddHostDialog },
  data() {
    return {
      hosts: [],
      dialogVisible: false,
      currentHost: null,
      deleteVisible: false,
      deleteLoading: false,
    }
  },
  methods: {
    async fetchList() {
      try {
        const res = await listPluginHosts()
        this.hosts = res.data || []
      } catch (e) {
        console.error('加载主机列表失败:', e)
      }
    },
    handleAdd() {
      this.currentHost = null
      this.dialogVisible = true
    },
    handleEdit(host) {
      this.currentHost = host
      this.dialogVisible = true
    },
    handleConnect(host) {
      this.$router.push({ name: 'webshellWorkbench', query: { hostId: host.id } })
    },
    handleDelete(host) {
      this.currentHost = host
      this.deleteVisible = true
    },
    async handleConfirmDelete() {
      if (!this.currentHost) return
      this.deleteLoading = true
      try {
        await deletePluginHost(this.currentHost.id)
        this.deleteVisible = false
        this.fetchList()
      } catch (e) {
        console.error('删除失败:', e)
      } finally {
        this.deleteLoading = false
      }
    },
  },
  mounted() {
    this.fetchList()
  },
}
</script>

<style scoped>
.manage-page {
  padding: 24px;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  flex-shrink: 0;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}
.header-left h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}
.btn-back {
  width: 32px;
  height: 32px;
  border: 1px solid var(--border);
  background: #fff;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
}
.btn-back:hover { background: var(--bg-hover); }
.btn-primary {
  padding: 7px 18px;
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  font-family: inherit;
}
.btn-primary:hover { opacity: 0.9; }
.table-wrap {
  flex: 1;
  overflow-y: auto;
}
.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.data-table th {
  text-align: left;
  padding: 10px 12px;
  border-bottom: 2px solid var(--border);
  color: var(--text-muted);
  font-weight: 500;
}
.data-table td {
  padding: 10px 12px;
  border-bottom: 1px solid var(--border);
}
.action-cell { display: flex; gap: 8px; }
.btn-link {
  border: none;
  background: none;
  color: var(--accent);
  cursor: pointer;
  font-size: 12px;
  padding: 0;
  font-family: inherit;
}
.btn-link:hover { text-decoration: underline; }
.btn-link.btn-danger { color: #ef4444; }
.empty-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  font-size: 14px;
}
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.35);
  z-index: 1100;
  display: flex;
  align-items: center;
  justify-content: center;
}
.confirm-dialog {
  background: #fff;
  border-radius: 10px;
  width: 360px;
  box-shadow: 0 8px 30px rgba(0,0,0,0.15);
}
.dialog-header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
  font-size: 14px;
  font-weight: 600;
}
.dialog-body { padding: 20px 16px; font-size: 14px; }
.dialog-body p { margin: 0; }
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 10px 16px;
  border-top: 1px solid var(--border);
}
.btn-outline {
  padding: 6px 14px;
  background: #fff;
  color: var(--text-secondary);
  border: 1px solid var(--border);
  border-radius: 5px;
  font-size: 12px;
  cursor: pointer;
}
.btn-danger {
  padding: 6px 14px;
  background: #ef4444;
  color: #fff;
  border: none;
  border-radius: 5px;
  font-size: 12px;
  cursor: pointer;
}
.btn-danger:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
